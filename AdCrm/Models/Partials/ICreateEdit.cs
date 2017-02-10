using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public interface ICreateEdit
    {
        DateTime CreateDate { get; set; }
        DateTime? ChangeDate { get; set; }
        string Creator { get; set; }
        string Changer { get; set; }
    }
}