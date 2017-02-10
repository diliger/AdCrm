using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ExpensePrice : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.CreateDate,
                this.CreatorID,
                this.EmployeeID,
                this.ExpenseTypeID,
                this.ID,
                this.Value,
                CreatorName = this.UserCreator.FullName
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            User user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
            e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select && user.RoleID > (int)RolesEnum.Manager;
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
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}