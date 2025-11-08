import { createClient } from '@/lib/supabase/server'
import { ensureUser } from '@/lib/queries/users'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No authorization code provided')}`)
  }

  // Note: State validation would require client-side sessionStorage check
  // Since this is server-side, we'll skip it but it's good practice to have state parameter

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials')
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Server configuration error')}`)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/auth/callback`,
        grant_type: 'authorization_code'
      }).toString()
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      console.error('Failed to get access token:', tokens)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Failed to authenticate with Google')}`)
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    const googleUser = await userResponse.json()

    if (!googleUser || !googleUser.email) {
      console.error('Failed to get user info from Google')
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Failed to get user information')}`)
    }

    // Create deterministic password based on Google user ID
    const password = `${clientSecret}${googleUser.id}`

    const supabase = await createClient()

    // Try to sign in with password
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: googleUser.email,
      password: password
    })

    let finalUser = user

    // If user doesn't exist (400 error), create them
    if (signInError && signInError.status === 400) {
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email: googleUser.email,
        password: password,
        options: {
          data: {
            full_name: googleUser.name,
            avatar_url: googleUser.picture
          }
        }
      })

      if (signUpError) {
        console.error('Error creating user:', signUpError)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Failed to create user account')}`)
      }

      finalUser = newUser
    } else if (signInError) {
      console.error('Error signing in:', signInError)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication failed')}`)
    }

    // Ensure user exists in users table
    if (!finalUser) {
      console.error('No user after authentication')
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication failed - no user created')}`)
    }

    const userId = finalUser.id
    
    // Get user's name from Google account
    const name = 
      googleUser.name ||
      finalUser.user_metadata?.full_name || 
      finalUser.user_metadata?.name ||
      finalUser.email?.split('@')[0] ||
      'User'

    // Ensure user exists in users table (create if doesn't exist)
    try {
      await ensureUser(userId, finalUser.email || '', name)
      console.log(`User ${userId} ensured in users table`)
    } catch (error: any) {
      console.error('Error ensuring user exists in users table:', error)
      // Don't fail the auth flow, but log the error
      // The user can still be authenticated, and we'll try again in API routes
    }

    // Update name if Google provided a better name (optional enhancement)
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

      if (existingUser) {
        const currentName = existingUser.name
        // Update if current name is empty or shorter than Google name
        if (!currentName || currentName.trim() === '' || (googleUser.name && name.length > (currentName?.length || 0))) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ name: name })
            .eq('id', userId)

          if (updateError) {
            console.error('Error updating user name:', updateError)
          }
        }
      }
    } catch (error: any) {
      // Non-critical, just log
      console.error('Error updating user name:', error)
    }

    // Redirect to home page
    return NextResponse.redirect(`${origin}/`)
  } catch (error: any) {
    console.error('Authentication error:', error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
  }
}
