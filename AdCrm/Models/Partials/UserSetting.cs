using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class UserSetting
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.UserID,
                this.Name,
                this.Value
            };
        }
    }
}