import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Put,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expenseService.create(dto);
  }

  @Get()
  getGroupExpenses(@Query('groupId') groupId: number) {
    return this.expenseService.getGroupExpenses(groupId);
  }

  @Get('balance')
  getGroupBalance(@Query('groupId') groupId: number) {
    return this.expenseService.getBalances(groupId);
  }

  @Get('settlements')
  getGroupSettlements(@Query('groupId') groupId: number) {
    return this.expenseService.calculateSettlements(groupId);
  }

  @Put(':id')
  updateExpense(@Param('id') id: number, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(id, dto);
  }
}
