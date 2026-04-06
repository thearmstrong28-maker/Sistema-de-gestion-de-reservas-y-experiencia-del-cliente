import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { ListWaitlistQueryDto } from './dto/list-waitlist.query';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Host)
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  create(@Body() createWaitlistEntryDto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(createWaitlistEntryDto);
  }

  @Get()
  list(@Query() query: ListWaitlistQueryDto) {
    return this.waitlistService.list(query);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWaitlistEntryDto: UpdateWaitlistEntryDto,
  ) {
    return this.waitlistService.update(id, updateWaitlistEntryDto);
  }
}
