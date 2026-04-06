import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('reads daily occupancy view', async () => {
    dataSource.query.mockResolvedValue([
      {
        shiftId: 'shift-1',
        shiftDate: '2026-04-06',
        shiftName: 'dinner',
        totalTables: '10',
        occupiedTables: '7',
        reservedGuests: '24',
        totalCapacity: '40',
        occupancyPercent: '70',
      },
    ]);

    const rows = await service.getDailyOccupancy({
      date: new Date('2026-04-06T00:00:00.000Z'),
    });

    expect(dataSource.query).toHaveBeenCalled();
    expect(rows[0].occupancyPercent).toBe(70);
  });

  it('reads frequent customers view with min visits and limit', async () => {
    dataSource.query.mockResolvedValue([
      {
        customerId: 'customer-1',
        fullName: 'Ana Ruiz',
        email: 'ana@mail.test',
        phone: null,
        visitCount: '5',
        noShowCount: '1',
        lastVisitAt: '2026-04-05T21:00:00.000Z',
      },
    ]);

    const rows = await service.getFrequentCustomers({
      minVisits: 3,
      limit: 10,
    });

    expect(dataSource.query).toHaveBeenCalled();
    expect(rows[0].visitCount).toBe(5);
    expect(rows[0].noShowCount).toBe(1);
  });
});
