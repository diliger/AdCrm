using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm
{
    public class Log : global::Helpers.Log
    {
        public override void SendEmail(Exception Ex, System.IO.FileInfo LogFile)
        {
        }

        public override void WriteToDb(Exception Ex, System.IO.FileInfo LogFile)
        {
        }
    }
}