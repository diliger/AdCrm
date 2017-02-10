using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class ContactType
    {
        public object ToJson()
        {
            return new
            {
                this.Deleted,
                this.ID,
                this.Name,
                this.OrderNumber,
                this.ParentID,
                this.SysName
            };
        }
    }
}