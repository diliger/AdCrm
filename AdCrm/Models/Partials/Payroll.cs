using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Payroll : IEntity, ICreateEdit
    {
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
                this.Creator,
                this.CreateDate,
                this.Date,
                this.ID,
                this.Amount,
                this.EmployeeID,
                this.ProjectID,
                this.Month,
                this.Comments,
                this.Frozen,
                EmployeeName = Employee != null ? Employee.FullName : "",
                ProjectName = Project != null ? Project.Name : ""
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;

            e.Cancel = user.RoleID != (int)RolesEnum.Admin && Frozen && (e.Action == EntityJs.Client.Events.ActionsEnum.Edit || e.Action == EntityJs.Client.Events.ActionsEnum.Delete);
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
            
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (this.Date == new DateTime())
                this.Date = DateTime.Now;
            if (this.Month == 0)
                this.Month = Date.Month;
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}