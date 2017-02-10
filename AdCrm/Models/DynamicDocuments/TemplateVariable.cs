using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using DynamicDocumentGenerator;

namespace AdCrm.Models.DynamicDocuments
{
    public class TemplateVariable : ITemplateVariable
    {
        public string Name
        {
            get;
            set;
        }

        public string Format
        {
            get;
            set;
        }

        public bool AllowNull
        {
            get
            {
                return true;
            }
            set
            {
                throw new NotImplementedException();
            }
        }

        public string Path
        {
            get;
            set;
        }

        public bool IsStatic
        {
            get
            {
                return false;
            }
            set
            {
                throw new NotImplementedException();
            }
        }
    }
}