import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { ReportsController } from './reports.controller';

describe('ReportsController RBAC', () => {
  it('allows manager at controller level', () => {
    const classRoles = Reflect.getMetadata(ROLES_KEY, ReportsController) as
      | Role[]
      | undefined;

    expect(classRoles).toEqual([Role.Admin, Role.Manager]);
  });

  it('keeps delete snapshot restricted to admin', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReportsController.prototype,
      'deleteSnapshot',
    );
    const methodRoles = Reflect.getMetadata(
      ROLES_KEY,
      descriptor?.value as object,
    ) as Role[] | undefined;

    expect(methodRoles).toEqual([Role.Admin]);
  });
});
