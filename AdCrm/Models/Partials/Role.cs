using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class Role
    {
        public object ToJson()
        {
            return new { this.ID, this.Name, this.SysName, this.Deleted };
        }
    }
}