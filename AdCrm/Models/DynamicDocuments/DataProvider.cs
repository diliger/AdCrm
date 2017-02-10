using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using DynamicDocumentGenerator;

namespace AdCrm.Models.DynamicDocuments
{
    public class DataProvider : IDataProvider
    {
        public ITemplateVariable GetVariable(string Key)
        {
            string[] parts = Key.Replace("{", "").Replace("}", "").Split(new[] { "/\\/" }, StringSplitOptions.RemoveEmptyEntries);
            return new TemplateVariable() { Name = Key, Format = parts.Length > 1 ? "{0:" + parts[1] + "}" : "", Path = parts[0] };
        }

        public string BaseUrl
        {
            get
            {
                return MvcApplication.FullRootUrl;
            }
        }
        public string Name { get; set; }
        public string Number { get; set; }
        public DateTime Date { get { return DateTime.Now; } }
        public Object Data { get; set; }
        public User User { get; set; }
        public Project Project { get; set; }
        public Project p
        {
            get
            {
                return Project;
            }
        }

        public void Dispose()
        {

        }
    }
}