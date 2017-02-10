//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Web;
//using EntityJs.Client.Objects;

//namespace AdCrm.Models
//{
//    public partial class WorkLog : IEntity
//    {
//        public object ToJson()
//        {
//            return new
//            {
//                this.Comments,
//                this.CreateDate,
//                this.Date,
//                this.EmployeeID,
//                this.Hours,
//                this.ID,
//                this.ProjectID,
//                ProjectName = this.Project != null ? this.Project.Name : ""
//            };
//        }

//        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
//        {

//            e.Cancel = false;
//        }

//        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }

//        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
//        {
//        }
//    }
//}