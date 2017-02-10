using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Contact : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.TypeID,
                this.Text,
                this.PersonID,
                this.ID,
                this.Comments
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
            BuildingEntities db = (BuildingEntities)e.Context;
            var newContractors = db.Contractors.Find(val => val.ID <= 0).ToList();
            for (int i = 0; i < newContractors.Count; i++)
            {
                if (newContractors[i].EntityState == System.Data.EntityState.Deleted) 
                    continue;

                ContactPerson cp = db.ContactPersons.Find(val => val.ID == this.PersonID).FirstOrDefault();
                if (cp != null)
                {
                    this.ContactPerson = cp;
                    cp.Contacts.Add(this);
                }
                newContractors[i].RefreshContacts(db);
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}