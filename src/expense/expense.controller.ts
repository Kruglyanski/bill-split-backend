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
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseHistoryService } from './expense-hystory.serviсe';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(
    private expenseService: ExpenseService,
    private expenseHistoryService: ExpenseHistoryService,
  ) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expenseService.create(dto, req.user.userId);
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
  updateExpense(
    @Param('id') id: number,
    @Body() dto: UpdateExpenseDto,
    @Request() req,
  ) {
    return this.expenseService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  deleteExpense(@Param('id') id: number, @Request() req) {
    return this.expenseService.delete(id, req.user.userId);
  }

  @Get('/history')
  async getHistory(@Request() req) {
    return this.expenseHistoryService.findAllByUserId(req.user.userId);
  }
}
