import { Module, forwardRef } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { UserModule } from '../user/user.module';
import { GroupModule } from '../group/group.module';

@Module({
  imports: [UserModule, forwardRef(() => GroupModule)],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class AppGatewayModule {}
