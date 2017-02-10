using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Refbook : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.Deleted,
                this.ID,
                this.Name,
                this.NeedDescription,
                this.OrderNumber,
                this.NeedDate,
                this.DateCaption,
                this.DescriptionCaption,
                this.TypeID, 
                this.SysName
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete;
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

        //#region IHistoryEntity
        //public string GetTextValue(SchoolEntities Context, string FieldName)
        //{
        //    switch (FieldName)
        //    {
        //        case "TypeID": return this.Type != null ? this.Type.Name : string.Empty;
        //        default: return "";
        //    }
        //}

        //public bool IsHistoryField(string FieldName)
        //{
        //    string[] historyFields = new string[] { "Comments", "Deleted", "Name", "NeedDescription", "OrderNumber", "NeedDate", "DateCaption", "DescriptionCaption", "TypeID", "SysName" };

        //    return historyFields.Contains(FieldName);
        //}
        //#endregion
    }
}