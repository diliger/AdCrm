using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Contract : IEntity
    {
        public bool OriginalActsExist
        {
            get
            {
                return !Acts.Any(val => !val.OriginalExists);
            }
        }

        public object ToJson()
        {
            return new
            {
                this.ChangeDate,
                this.ChangerID,
                this.Comments,
                this.ContractorID,
                this.CreateDate,
                this.CreatorID,
                this.DateSign,
                this.DateAdvance,
                this.SumAdvance,
                this.ID,
                this.Number,
                this.OriginalExists,
                this.ProjectID,
                this.RoleID,
                this.ParentID,
                this.DateEnd,
                this.Deleted
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;
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
            if (ParentID.HasValue)
            {
                BuildingEntities db = (BuildingEntities) e.Context;
                Contract parent = db.Contracts.FirstOrDefault(val => val.ID == ParentID && val.ContractorID == this.ContractorID);
                ParentID = parent == null ? null : ParentID;
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (ParentID.HasValue)
            {
                BuildingEntities db = (BuildingEntities)e.Context;
                Contract parent = db.Contracts.FirstOrDefault(val => val.ID == ParentID && val.ContractorID == this.ContractorID);
                ParentID = parent == null ? null : ParentID;
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}