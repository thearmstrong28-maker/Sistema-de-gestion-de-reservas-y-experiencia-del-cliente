export enum Role {
  Admin = 'admin',
  Host = 'host',
  Manager = 'manager',
  Customer = 'customer',
}

export const ALL_ROLES: Role[] = [
  Role.Admin,
  Role.Host,
  Role.Manager,
  Role.Customer,
];
