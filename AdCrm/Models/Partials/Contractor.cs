using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class Contractor : EntityJs.Client.Objects.IEntity
    {
        public object Details
        {
            get
            {
                if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
                {
                    return this.LegalDetails.FirstOrDefault();
                }
                else
                {
                    return this.PhysicalDetails.FirstOrDefault();
                }
            }
        }

        public ContactPerson MainContactPerson
        {
            get
            {
                return this.ContactPersons.OrderBy(val => val.ID).FirstOrDefault(val => val.IsMain);
            }
        }
        public ContactPerson Signer
        {
            get
            {
                return this.ContactPersons.FirstOrDefault(val => !val.Deleted && val.IsSigner);
            }
        }

        public string FullName
        {
            get
            {
                if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
                {
                    LegalDetail details = this.LegalDetails.FirstOrDefault();
                    return details != null && details.FullName.IsNotNullOrEmpty() ? details.FullName : this.Name;
                }
                else
                {
                    PhysicalDetail details = this.PhysicalDetails.FirstOrDefault();
                    return details != null && details.FullName.IsNotNullOrEmpty() ? details.FullName : this.Name;
                }
            }
        }

        public string ShortName
        {
            get
            {
                if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
                {
                    LegalDetail details = this.LegalDetails.FirstOrDefault();
                    return details != null && details.Name.IsNotNullOrEmpty() ? details.Name : this.Name;
                }
                else
                {
                    PhysicalDetail details = this.PhysicalDetails.FirstOrDefault();
                    return details != null && details.FullName.IsNotNullOrEmpty() ? mString.ShortName(details.Surname, details.Name, details.Patronymic) : this.Name;
                }
            }
        }

        public string FullAddress
        {
            get
            {
                if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
                {
                    LegalDetail details = this.LegalDetails.FirstOrDefault();
                    return details != null && details.LegalAddress.IsNotNullOrEmpty() ? details.LegalAddress : this.Address;
                }
                else
                {
                    PhysicalDetail details = this.PhysicalDetails.FirstOrDefault();
                    return details != null && details.RegisterAddress.IsNotNullOrEmpty() ? details.RegisterAddress : this.Address;
                }
            }
        }

        public string GetPhone(BuildingEntities db)
        {
            string result = null;
            var cp = db.ContactPersons.Find(val => val.ContractorID == this.ID && val.IsMain).ToList().FirstOrDefault(val => val.EntityState != System.Data.EntityState.Deleted);
            if (cp != null)
                result = cp.Phone;
            if (result.IsNotNullOrEmpty())
                return result;

            if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
            {
                LegalDetail details = this.LegalDetails.FirstOrDefault();
                return details != null ? details.Phone : string.Empty;
            }
            else
            {
                PhysicalDetail details = this.PhysicalDetails.FirstOrDefault();
                return details != null ? details.Phone : string.Empty;
            }
        }

        public string GetEmail(BuildingEntities db)
        {
            string result = null;
            var cp = db.ContactPersons.Find(val => val.ContractorID == this.ID && val.IsMain).ToList().FirstOrDefault(val => val.EntityState != System.Data.EntityState.Deleted);
            if (cp != null)
            {
                result = string.Join(";", cp.Contacts.Where(val => val.ContactType.SysName.Contains("email") && val.Text.IsNotNullOrEmpty()).Select(val => val.Text));
            }
            if (result.IsNotNullOrEmpty())
                return result;

            if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Person)
            {
                PhysicalDetail details = this.PhysicalDetails.FirstOrDefault();
                result = details != null ? details.Email : string.Empty;
            }

            if (result.IsNotNullOrEmpty() && Users.Any())
                return string.Join(";", Users.Select(val => val.Email));

            return result;
        }

        public string ContactsToString()
        {
            string result = "";
            ContactPersons.OrderBy(val => val.TypeID).ThenBy(val => val.ID).ToList().ForEach(val =>
            {
                var text = val.ContactsToString();
                //if (text.IsNotNullOrEmpty())
                {
                    result += val.FullName + ": " + text + " \n";
                }
            });
            return result;
        }

        partial void OnArchivedChanged()
        {
            if (Archived)
            {
                ArchiveDate = DateTime.Now;
            }
            else
            {
                ArchiveDate = null;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Address,
                this.ChangeDate,
                this.ChangerID,
                this.CreateDate,
                this.CreatorID,
                this.Deleted,
                this.ID,
                this.Archived,
                this.ArchiveDate,
                this.Name,
                this.RoleID,
                this.TypeID,
                this.Comments,
                this.StatusID,
                this.Specialization,
                this.Description,
                this.SourceID,
                this.ResponsibleID,
                this.SubTypeID,
                this.Phone,
                this.Email,
                this.DepartmentID,
                CreatorName = this.UserCreator != null ? this.UserCreator.FullName : string.Empty,
                MainContactName = MainContactPerson != null ? MainContactPerson.FullName : string.Empty,
                MainContactsText = MainContactPerson != null ? MainContactPerson.ContactsToString() : string.Empty
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;
            if (this.Archived && e.Action == EntityJs.Client.Events.ActionsEnum.Edit)
            {
                List<string> keys = e.Values.Keys.ToList();
                keys.ForEach(val =>
                {
                    if (val != "Archived" && val != "Deleted")
                    {
                        e.Values.Remove(val);
                    }
                });
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
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (this.Phone.IsNullOrEmpty() || this.Email.IsNullOrEmpty())
            {
                this.Phone = this.Phone.IsNullOrEmpty() ? GetPhone(db) : this.Phone;
                this.Email = this.Email.IsNullOrEmpty() ? GetEmail(db) : this.Email;
                //if (this.EntityState == System.Data.EntityState.Modified)
                //{
                //    db.SaveChanges();
                //}
            }
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            this.Phone = GetPhone(db);
            this.Email = GetEmail(db);
            if (this.TypeID == 0)
                this.TypeID = ContractorTypesEnum.Company;
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Person)
            {
                List<LegalDetail> details = db.LegalDetails.Where(val => val.ContractorID == this.ID).ToList();
                details.ForEach(val => db.DeleteObject(val));
            }
            else if (TypeID == (int)BuildingEntities.ContractorTypesEnum.Company)
            {
                List<PhysicalDetail> details = db.PhysicalDetails.Where(val => val.ContractorID == this.ID).ToList();
                details.ForEach(val => db.DeleteObject(val));
            }
            RefreshContacts(db);
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void RefreshContacts(BuildingEntities db)
        {
            this.Phone = GetPhone(db);
            this.Email = GetEmail(db);
        }
    }
}