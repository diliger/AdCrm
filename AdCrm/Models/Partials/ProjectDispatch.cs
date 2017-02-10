using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace Building.Models
{
    public partial class ProjectDispatch : IEntity, ICreateEdit
    {
        public string ProjectName
        {
            get
            {
                return this.Project != null ? this.Project.FullName : string.Empty;
            }
        }
        public string EmployeeName
        {
            get
            {
                return this.Employee != null ? this.Employee.FullName : string.Empty;
            }
        }
        public string OrderName
        {
            get
            {
                return this.Order != null ? this.Order.Name : string.Empty;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.ID,
                this.ProjectID,
                this.Comments,
                this.Creator,
                this.Changer,
                this.CreateDate,
                this.ChangeDate,
                this.ProjectName,
                this.EmployeeID,
                this.Date,
                this.EmployeeName,
                this.CreatorID,
                this.OrderID,
                this.OrderName,
                this.Amount,
                this.Name
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;

            e.Cancel = false;
            if (e.Action != EntityJs.Client.Events.ActionsEnum.Select)
            {
                e.Values.Remove("CreatorID");
                if (user.RoleID != (int)RolesEnum.Admin && user.ID != this.CreatorID && e.Action != EntityJs.Client.Events.ActionsEnum.Insert)
                    e.Cancel = true;
            }
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
            List<ProductDispatch> products = this.ProductDispatches.ToList();
            foreach (ProductDispatch p in products)
            {
                p.ProjectDispatchID = null;
                p.ProjectProductID = null;
                p.ChangeDate = DateTime.Now;
                p.Deleted = true;
            }
            DeleteProjectExpense((BuildingEntities)e.Context);
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            UpdateProjectExpense((BuildingEntities)e.Context);
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            UpdateProjectExpense((BuildingEntities)e.Context);
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        private bool UpdateProjectExpense(BuildingEntities db)
        {
            DateTime date = DateTime.Now;
            int userID = db.CurrentUser.ID;
            ExpenseType dispatchType = db.ExpenseTypes.Where(val => val.SysName == "dispatch").FirstOrDefault();
            if (dispatchType == null)
                return false;

            Wallet storeWallet = dispatchType.Wallet;
            if (storeWallet == null)
                return false;

            List<Expense> rows = db.Expenses.Where(val => val.DispatchID == this.ID).ToList();
            if (!rows.Any())
            {
                Expense row = new Expense()
                {
                    ChangeDate = date,
                    ChangerID = userID,
                    Count = 1,
                    CreateDate = date,
                    CreatorID = userID,
                    Date = date,
                    DispatchID = this.ID,
                    ProjectDispatch = this,
                    //EmployeeID = this.EmployeeID,
                    Name = this.Name,
                    Comments = this.Comments,
                    Price = this.Amount,
                    ProjectID = this.ProjectID,
                    Sum = this.Amount,
                    PeriodSum = this.Amount,
                    Type = dispatchType,
                    Wallet = storeWallet
                };
                rows.Add(row);
                db.Expenses.AddObject(row);
                row.OnInserted(new EntityJs.Client.Events.EntityEventArgs(db, "Expenses", "Expense", row, EntityJs.Client.Events.ActionsEnum.Insert));
            }
            else
            {
                Expense row = rows.First();
                row.Sum = Amount;
                row.PeriodSum = this.Amount;
                row.ProjectID = ProjectID;
                //row.EmployeeID = EmployeeID;
                row.Price = Amount;
                row.Date = Date;
                row.Name = Name;
                row.Comments = Comments;
                row.ChangeDate = date;
                row.ChangerID = userID;
                row.OnUpdated(new EntityJs.Client.Events.EntityEventArgs(db, "Expenses", "Expense", row, EntityJs.Client.Events.ActionsEnum.Edit));
                foreach (Expense item in rows.Skip(1))
                {
                    db.Expenses.DeleteObject(item);
                }
            } 
            return true;
        }

        private void DeleteProjectExpense(BuildingEntities db)
        {
            List<Expense> rows = db.Expenses.Where(val => val.DispatchID == this.ID).ToList();
            foreach (Expense item in rows)
            {
                db.Expenses.DeleteObject(item);
            }
        }
    }
}