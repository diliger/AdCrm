using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models.Reports
{
    public class SalaryRow
    {
        public int ID { get; set; }
        public int RowID { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; }
        public string Creator { get; set; }
        public string Project { get; set; }
        public string EmployeeName { get; set; }
        public string Comments { get; set; }

        public decimal Debt { get; set; }
        public int? Month { get; set; }

        private Employee Employee { get; set; }

        public SalaryRow(Expense Row)
        {
            ID = Row.ID;
            RowID = Row.ID;
            Date = Row.Date;
            Amount = Row.Sum;
            Type = "expense";
            Creator = Row.UserCreator.FullName;
            Project = Row.Project != null ? Row.Project.Name : string.Empty;
            Employee = Row.SalaryEmployee;
            EmployeeName = Employee.FullName;
            Comments = Row.Comments;

            CalcDebt();
        }

        public SalaryRow(Payroll Row)
        {
            ID = Row.ID * -1;
            RowID = Row.ID;
            Date = Row.Date;
            Amount = Row.Amount;
            Type = "payroll";
            Creator = Row.Creator;
            Project = Row.Project != null ? Row.Project.Name : string.Empty;
            Employee = Row.Employee;
            Month = Row.Month;
            EmployeeName = Employee.FullName;
            Comments = Row.Comments;

            CalcDebt();
        }

        private void CalcDebt()
        {
            decimal balance;

            if (this.Type == "expense")
            {
                decimal expenses = Employee.SalaryExpenses.Where(val => val.Type.ForSalary && (val.Date < this.Date || val.Date == this.Date && val.ID <= this.RowID)).Sum(val => val.Sum);
                decimal payrolls = Employee.Payrolls.Where(val => val.Date <= this.Date).Sum(val => val.Amount);
                balance = expenses - payrolls;
            }
            else
            {
                balance = Employee.SalaryExpenses.Where(val => val.Type.ForSalary && val.Date < this.Date).Sum(val => val.Sum)
                    - Employee.Payrolls.Where(val => (val.Date < this.Date || val.Date == this.Date && val.ID <= this.RowID)).Sum(val => val.Amount);
            }

            this.Debt = -1 * balance;
        }
    }
}