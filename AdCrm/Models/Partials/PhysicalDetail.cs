using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class PhysicalDetail : IEntity
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

        public object ToJson()
        {
            return new
            {
                this.ContractorID,
                this.Comments,
                this.Email,
                this.ID,
                this.Name,
                this.PassportIssueDate,
                this.PassportIssuer,
                this.PassportNumber,
                this.PassportSerie,
                this.PassportSubcode,
                this.Patronymic,
                this.Phone,
                this.Surname,
                this.LiveAddress,
                this.RegisterAddress,
                this.Inn
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
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}