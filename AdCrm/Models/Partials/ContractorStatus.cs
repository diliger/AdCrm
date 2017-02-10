using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class ContractorStatus
    {
        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.ID,
                this.Name,
                this.Color,
                this.OrderNumber,
                this.SysName,
                this.RoleID
            };
        }
    }
}