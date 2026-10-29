// Friendly Portuguese messages for the most common card declines.
export function declineMessage(detail: string | undefined) {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
    cc_rejected_bad_filled_security_code: 'O código de segurança está errado.',
    cc_rejected_bad_filled_date: 'A data de validade está errada.',
    cc_rejected_bad_filled_card_number: 'O número do cartão está errado.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
    cc_rejected_call_for_authorize: 'O banco pediu para você autorizar a compra. Ligue para ele e tente de novo.',
    cc_rejected_card_disabled: 'O cartão está bloqueado. Fale com o banco.',
    cc_rejected_duplicated_payment: 'Esse pagamento já foi feito.',
    cc_rejected_high_risk: 'O pagamento foi recusado por segurança. Tente o Pix.',
    cc_rejected_max_attempts: 'Limite de tentativas atingido. Use outro cartão ou o Pix.',
  }
  return map[detail || ''] || 'O pagamento foi recusado. Tente outro cartão ou pague com Pix.'
}
