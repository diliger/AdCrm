using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class ProjectFileType : DynamicDocumentGenerator.ITemplate
    {
        public byte[] BinaryContent
        {
            get
            {
                return System.IO.File.ReadAllBytes(PhysicalPath);
            }
            set
            {
                if (value != null)
                {
                    System.IO.File.WriteAllBytes(PhysicalPath, value);
                }
            }
        }

        public string TemplatesPath
        {
            get
            {
                return "Templates";
            }
        }

        public string PhysicalPath
        {
            get
            {
                return Path.Combine(HttpRuntime.AppDomainAppPath, this.TemplatesPath, this.FileName);
            }
        }
    }
}