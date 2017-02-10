using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Expense : IEntity
    {
        public string WalletName
        {
            get
            {
                var user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
                if (user.RoleID == (int)RolesEnum.Employee)
                {
                    return this.Wallet != null ? this.EmployeeID == user.EmployeeID && this.Wallet.EmployeeID == user.EmployeeID ? Wallet.PersonalName : this.Wallet.Name : string.Empty;
                }
                else
                {
                    return this.Wallet != null ? this.Wallet.Name : string.Empty;
                }
            }
        }

        public string ProjectName
        {
            get
            {
                return Project == null ? string.Empty : Project.Name;
            }
        }

        public bool ReadOnly
        {
            get
            {
                return this.DispatchID.HasValue;
            }
        }

        public bool Frozen
        {
            get
            {
                return (DateTime.Now - CreateDate).Days >= BuildingEntities.FrozenAfter;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.CreatorID,
                this.CreateDate,
                this.Date,
                this.ID,
                this.Name,
                this.WalletID,
                this.Sum,
                this.TypeID,
                this.PeriodSum,
                this.ParentID,
                this.EmployeeID,
                this.ProjectID,
                this.Price,
                this.Count,
                this.SalaryEmployeeID,
                this.DispatchID,
                this.ReadOnly,
                this.Frozen,
                EmployeeName = Employee != null ? Employee.FullName : "",
                SalaryEmployeeName = SalaryEmployee != null ? SalaryEmployee.FullName : "",
                this.ProjectName,
                UnitName = Type != null ? Type.UnitName : "",
                this.WalletName,
                CreatorName = this.UserCreator != null ? this.UserCreator.FullName : string.Empty
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            User user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();

            e.Cancel = user.RoleID != (int)RolesEnum.Admin && Frozen && (e.Action == EntityJs.Client.Events.ActionsEnum.Edit || e.Action == EntityJs.Client.Events.ActionsEnum.Delete);

            e.Cancel = e.Cancel || e.Action != EntityJs.Client.Events.ActionsEnum.Select && this.ParentID.HasValue ||
                (user.RoleID == (int)RolesEnum.Employee && e.Action != EntityJs.Client.Events.ActionsEnum.Insert && this.EmployeeID != user.EmployeeID);

            if (user.RoleID == (int)RolesEnum.Employee && e.Action != EntityJs.Client.Events.ActionsEnum.Select && e.Values.ContainsKey("EmployeeID"))
            {
                e.Values.Remove("EmployeeID");
            }

            if (!e.Cancel && user.RoleID == (int)RolesEnum.Manager)
            {

                switch (e.Action)
                {
                    case EntityJs.Client.Events.ActionsEnum.Insert: e.Cancel = false; break;
                    case EntityJs.Client.Events.ActionsEnum.Select: e.Cancel = !(this.CreatorID == user.ID || this.EmployeeID == user.EmployeeID
                        || (this.Project != null && this.Project.ResponsibleID == user.ID)/* || (this.Employee != null && this.Employee.User != null && this.Employee.User.RoleID == (int)RolesEnum.Employee)*/); break;
                    default: e.Cancel = this.CreatorID != user.ID; break;
                }
            }

            //e.Cancel = e.Cancel || e.Action != EntityJs.Client.Events.ActionsEnum.Select && Project != null && Project.Archived;
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
            e.Values.Remove("ParentID");
            e.Values.Remove("Sum");
            e.Values.Remove("DispatchID");
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
            e.Values.Remove("ParentID");
            e.Values.Remove("Sum");
            e.Values.Remove("DispatchID");
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
            List<Expense> children = this.ChildExpenses.ToList();
            children.ForEach(val => e.Context.DeleteObject(val));
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            User user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
            DateTime date = this.Date;
            int count = this.Type.PeriodID.HasValue ? this.Type.Period.Count : 0;
            count = count <= 0 ? 1 : count;
            decimal monthSum = Math.Round(this.PeriodSum / count, 2);
            this.Sum = this.PeriodSum - monthSum * (count - 1);
            //this.Count = this.Count - Math.Round(this.Count / count, 2) * (count - 1);

            if (user.RoleID == (int)RolesEnum.Employee && this.Type.SysName != "dispatch")
            {
                this.EmployeeID = user.EmployeeID;
            }

            for (int i = 0; i < count - 1; i++)
            {
                date = date.AddMonths(1);
                Expense expense = new Expense()
                {
                    ChangeDate = DateTime.Now,
                    ChangerID = ChangerID,
                    Comments = "Автоматический расход, на основании расхода за " + this.Date.ToString("MM.yyyy"),
                    CreateDate = DateTime.Now,
                    CreatorID = ChangerID,
                    Date = date,
                    Name = Name,
                    Sum = monthSum,
                    WalletID = WalletID,
                    TypeID = TypeID,
                    PeriodSum = PeriodSum,

                    Count = Math.Round(this.Count / count, 2),
                    Price = this.Price,
                    ProjectID = this.ProjectID,
                    EmployeeID = this.EmployeeID
                };
                e.Context.AddObject(this.EntityKey.EntitySetName, expense);
                expense.ParentExpense = this;
            }

            if (this.SalaryEmployeeID.HasValue && !this.Type.ForSalary)
                this.SalaryEmployeeID = null;
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            DateTime date = this.Date;
            int count = this.Type.PeriodID.HasValue ? this.Type.Period.Count : 0;
            count = count <= 0 ? 1 : count;
            decimal monthSum = Math.Round(this.PeriodSum / count, 2);
            this.Sum = this.PeriodSum - monthSum * (count - 1);

            List<Expense> children = this.ChildExpenses.ToList();

            while (children.Count > count - 1)
            {
                Expense last = children.Last();
                e.Context.DeleteObject(last);
                children.Remove(last);
            }

            for (int i = 0; i < count - 1; i++)
            {
                date = date.AddMonths(1);
                Expense expense;
                if (children.Count > i)
                {
                    expense = children[i];
                }
                else
                {
                    expense = new Expense()
                    {
                        CreateDate = DateTime.Now,
                        CreatorID = ChangerID
                    };
                    e.Context.AddObject(this.EntityKey.EntitySetName, expense);
                    expense.ParentExpense = this;
                }

                expense.ChangeDate = DateTime.Now;
                expense.ChangerID = ChangerID;
                expense.Comments = "Автоматический расход, на основании расхода за " + this.Date.ToString("MM.yyyy");
                expense.Date = date;
                expense.Name = Name;
                expense.PeriodSum = PeriodSum;
                expense.Sum = monthSum;
                expense.WalletID = WalletID;
                expense.TypeID = TypeID;

                expense.Count = Math.Round(this.Count / count, 2);
                expense.Price = this.Price;
                expense.ProjectID = this.ProjectID;
                expense.EmployeeID = this.EmployeeID;
            }

            if (this.SalaryEmployeeID.HasValue && !this.Type.ForSalary)
                this.SalaryEmployeeID = null;
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}