using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace Building.Models
{
    public partial class ProjectDispatchOrder : IEntity, ICreateEdit
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
                this.Amount,
                this.Name,
                this.StatusID
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db  = (BuildingEntities )e.Context;
            User user = db.CurrentUser;

            e.Cancel = false;
            if (e.Action != EntityJs.Client.Events.ActionsEnum.Select)
            {
                e.Values.Remove("CreatorID");
                if (user.RoleID != (int)RolesEnum.Admin && user.ID != this.CreatorID)
                {
                    e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete;
                    if (e.Action == EntityJs.Client.Events.ActionsEnum.Edit)
                    {
                        var keys = e.Values.Keys.ToList();
                        foreach (var key in keys)
                        {
                            if (key == "StatusID")
                                continue;
                            e.Values.Remove(key);
                        }
                    }
                }
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
            BuildingEntities db = (BuildingEntities)e.Context;
            List<ProjectDispatch> dispatches = ProjectDispatches.ToList();
            foreach (ProjectDispatch dispatch in dispatches)
            {
                EntityJs.Client.Events.CheckPermissionsEventArgs eargs = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "ProjectDispatches", "ProjectDispatch", dispatch, EntityJs.Client.Events.ActionsEnum.Delete);
                dispatch.OnDeleting(eargs);
                if (eargs.Result != OperationResultsEnum.Passed)
                {
                    var cpe = ((EntityJs.Client.Events.CheckPermissionsEventArgs)e);
                    cpe.Result = eargs.Result;
                    cpe.Errors.AddRange(eargs.Errors);
                    break;
                }
                db.ProjectDispatches.DeleteObject(dispatch);
            }
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