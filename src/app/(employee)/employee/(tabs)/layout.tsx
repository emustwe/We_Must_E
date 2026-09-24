import { EmployeeTabs } from "@/components/layout/employee-tabs";

export default function EmployeeTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <EmployeeTabs />
    </>
  );
}
