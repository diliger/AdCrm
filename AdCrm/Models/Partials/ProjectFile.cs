using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectFile : IEntity
    {
        public string PhysicalPath
        {
            get
            {
                return this.File != null ? this.File.RealPath : "";
            }
        }

        public object ToJson()
        {
            long size = 0;
            try
            {
                string path = this.PhysicalPath;
                FileInfo fi = new FileInfo(path);
                size = fi.Exists ? fi.Length : 0;
            }
            catch
            { }

            return new
            {
                this.ID,
                this.FileID,
                this.ProjectID,
                this.TypeID,
                this.CategoryID,
                this.ProjectTaskID,
                this.ProjectTaskMessageID,
                FileName = File != null ? this.File.Name : "",
                Size = size,
                Url = File != null ? this.File.DownloadPath : ""
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {

        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (this.File != null)
            {
                this.File.RemoveFile();
                db.Files.DeleteObject(this.File);
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}