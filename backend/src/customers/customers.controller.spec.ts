import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersController delete route', () => {
  let controller: CustomersController;
  const customersService = {
    remove: jest.fn().mockResolvedValue({
      id: 'customer-1',
      fullName: 'Ana Ruiz',
    }),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: customersService,
        },
      ],
    }).compile();

    controller = moduleRef.get<CustomersController>(CustomersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes DELETE /customers/:id on the controller', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CustomersController.prototype,
      'remove',
    );

    expect(
      Reflect.getMetadata(PATH_METADATA, descriptor?.value as object),
    ).toBe(':id');
    expect(
      Reflect.getMetadata(METHOD_METADATA, descriptor?.value as object),
    ).toBe(RequestMethod.DELETE);
  });

  it('delegates customer deletion to the service', async () => {
    await controller.remove('customer-1');
    expect(customersService.remove).toHaveBeenCalledWith('customer-1');
  });
});
