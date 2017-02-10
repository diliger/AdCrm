using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class SystemSetting
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.Title,
                this.Name,
                this.Value,
                this.Date,
                this.Public,
                this.Comments
            };
        }
    }
}