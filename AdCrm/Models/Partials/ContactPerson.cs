using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ContactPerson : IEntity
    {
        public string FullName
        {
            get
            {
                List<string> parts = new List<string>();
                parts.Add(Surname);
                parts.Add(Name);
                parts.Add(Patronymic);
                return string.Join(" ", parts.Where(val => val.StringAndTrim().IsNotNullOrEmpty()));
            }
        }

        public string ShortName
        {
            get
            {
                return mString.ShortName(Surname, Name, Patronymic);
            }
        }

        public string Phone
        {
            get
            {
                Contact contact = this.Contacts.FirstOrDefault(val => val.ContactType.SysName.Contains("phone"));
                return contact != null ? contact.Text : string.Empty;
            }
        }

        public string Email
        {
            get
            {
                Contact contact = this.Contacts.FirstOrDefault(val => val.ContactType.SysName.Contains("email"));
                return contact != null ? contact.Text : string.Empty;
            }
        }

        public string TShortName(string template)
        {
            return mString.ShortName(Surname, Name, Patronymic, template);
        }

        public object ToJson()
        {
            return new
            {
                this.Archived,
                this.Comments,
                this.ContractorID,
                this.Deleted,
                this.ID,
                this.IsMain,
                this.Name,
                this.Patronymic,
                this.Position,
                this.Surname,
                this.IsSigner,
                this.TypeID,
                this.GenderID,
                this.BirthDate
            };
        }

        public string ContactsToString()
        {
            string result = "";
            Contacts.OrderBy(val => val.TypeID).ThenBy(val => val.ID).ToList().ForEach(val =>
            {
                if (val.Text.IsNotNullOrEmpty())
                {
                    result += val.ContactType.Name + ": " + val.Text + " \n";
                }
            });
            return result;
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
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}