using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class Incident : EntityJs.Client.Objects.IEntity
    {
        public bool Read
        {
            get;
            set;
        }

        public String RemindTime
        {
            get;
            set;
        }

        public object ToJson()
        {
            return new
            {
                this.ID,
                this.Date,
                this.ForUserID,
                this.ForRoleID,
                this.CreatorID,
                this.TypeID,
                this.Name,
                this.Comments,
                this.Visible,
                this.Read,
                this.Remind,
                this.RemindDate,
                this.RemindTime,
                this.Repeat,
                this.RepeatTypeID,
                this.PrimaryID,
                this.SecondaryID
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            switch (e.Action)
            {
                case EntityJs.Client.Events.ActionsEnum.Insert:
                case EntityJs.Client.Events.ActionsEnum.Select:
                    e.Cancel = false; break;
                case EntityJs.Client.Events.ActionsEnum.Delete: e.Cancel = this.CreatorID != user.ID && user.RoleID > (int)RolesEnum.Boss; break;
                case EntityJs.Client.Events.ActionsEnum.Edit:
                    e.Cancel = false;
                    if (user.RoleID <= (int)RolesEnum.Boss)
                    {
                        break;
                    }
                    List<string> keys = e.Values.Keys.Where(val => val != "Read").ToList();
                    keys.ForEach(val => e.Values.Remove(val));
                    break;
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
            if (this.PrimaryID.HasValue)
            {
                List<Incident> incs = db.Incidents.Where(val => val.SecondaryID == this.ID).ToList();

                incs.ForEach(val => val.SecondaryID = null);
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities )e.Context;
            User user = db.CurrentUser;
            RemindTime = RemindDate.HasValue ? RemindDate.Value.ToShortTimeString() : "";
            Read = db.IncidentUsers.Any(val => val.IncidentID == this.ID && val.UserID == user.ID && val.Done);
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (RemindDate.HasValue)
            {
                DateTime date = RemindDate.Value.Date;
                RemindDate = RemindTime.IsNotNullOrEmpty() ? date.Add(TimeSpan.Parse(RemindTime)) : date;
            }

            if (Read)
            {
                DateTime date = DateTime.Now;
                IncidentUser iu = new IncidentUser() { ChangeDate = date, ChangerID = db.CurrentUser.ID, CreateDate = date, CreatorID = db.CurrentUser.ID, Done = true, Incident = this, UserID = db.CurrentUser.ID };
                db.IncidentUsers.AddObject(iu);
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            DateTime date;
            User user = db.CurrentUser;

            if (RemindDate.HasValue)
            {
                date = RemindDate.Value.Date;
                RemindDate = RemindTime.IsNotNullOrEmpty() ? date.Add(TimeSpan.Parse(RemindTime)) : date;
            }

            date = DateTime.Now;
            IncidentUser iu = db.IncidentUsers.FirstOrDefault(val => val.IncidentID == this.ID && val.UserID == user.ID);
            if (Read && iu == null)
            {
                iu = new IncidentUser() { ChangeDate = date, ChangerID = db.CurrentUser.ID, CreateDate = date, CreatorID = db.CurrentUser.ID, Done = true, Incident = this, UserID = db.CurrentUser.ID };
                db.IncidentUsers.AddObject(iu);
            }
            if (iu != null && iu.Done != Read)
            {
                iu.Done = Read;
                iu.ChangerID = user.ID;
                iu.ChangeDate = date;
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}