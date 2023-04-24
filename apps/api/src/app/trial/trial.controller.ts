import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException, HttpStatus
} from '@nestjs/common';
import { TrialService } from './trial.service';
import { CreateTrialDto } from './dto/create-trial.dto';
import { UpdateTrialDto } from './dto/update-trial.dto';
import { ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { trial } from "@prisma/client";

@Controller('trials')
@ApiTags("Trial")
export class TrialController {
  constructor(private readonly trialService: TrialService) {
  }

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "New trial created.",
    // content: { 'application/json': { schema: { $ref: '#/components/schemas/trial' } } }
  })
  async create(@Body() createTrialDto: CreateTrialDto): Promise<trial> {
    const newTrial = await this.trialService.createTrial(createTrialDto);
    return newTrial;
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: "List of trials found." })
  findAll() {
    return this.trialService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: "id", description: "ID of the trial." })
  @ApiResponse({ status: HttpStatus.OK, description: "Object found." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Trial with the requested ID could not be found." })
  async findOne(@Param('id') id: string) {
    const result = await this.trialService.findOne(+id);
    if (!result) {
      throw new NotFoundException(`Trial with ID ${id} was not found.`)
    }
    return result
  }

  @Patch(':id')
  @ApiParam({ name: "id", description: "ID of the trial to update." })
  @ApiResponse({ status: HttpStatus.OK, description: "Object updated." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Trial with the requested ID could not be found." })
  update(@Param('id') id: string, @Body() updateTrialDto: UpdateTrialDto) {
    return this.trialService.update(+id, updateTrialDto);
  }

  @Delete(':id')
  @ApiParam({ name: "id", description: "ID of the trial to delete." })
  @ApiResponse({ status: HttpStatus.OK, description: "Object deleted." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Trial with the requested ID could not be found." })
  async delete(@Param('id') id: string) {
    await this.trialService.delete(+id);
  }
}
