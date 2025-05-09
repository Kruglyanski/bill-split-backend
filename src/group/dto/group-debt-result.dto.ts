export class GroupDebtTransactionDto {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
}

export class GroupDebtResultDto {
  transactions: GroupDebtTransactionDto[];
  balances: {
    userId: number;
    userName: string;
    balance: number;
  }[];
}
