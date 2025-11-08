/**
 * Splitwise-style settlement algorithm
 * Minimizes the number of transactions needed to settle debts
 */

export interface Balance {
  userId: string
  userName: string
  amount: number // positive = owes, negative = is owed
}

export interface Settlement {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
}

/**
 * Calculate minimal transactions to settle all balances
 * Uses a greedy algorithm similar to Splitwise
 */
export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = []
  
  // Separate debtors (positive balance) and creditors (negative balance)
  const debtors: Balance[] = []
  const creditors: Balance[] = []
  
  balances.forEach(balance => {
    if (balance.amount > 0.01) {
      debtors.push({ ...balance })
    } else if (balance.amount < -0.01) {
      creditors.push({ ...balance, amount: Math.abs(balance.amount) })
    }
  })
  
  // Sort by amount (descending)
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)
  
  let debtorIdx = 0
  let creditorIdx = 0
  
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx]
    const creditor = creditors[creditorIdx]
    
    const settleAmount = Math.min(debtor.amount, creditor.amount)
    
    settlements.push({
      from: debtor.userId,
      fromName: debtor.userName,
      to: creditor.userId,
      toName: creditor.userName,
      amount: settleAmount,
    })
    
    debtor.amount -= settleAmount
    creditor.amount -= settleAmount
    
    if (debtor.amount < 0.01) {
      debtorIdx++
    }
    if (creditor.amount < 0.01) {
      creditorIdx++
    }
  }
  
  return settlements
}

