using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Folder : IEntity
    {
        public void RemoveFolder()
        {
            if (this.Url.IsNullOrEmpty())
                return;

            System.IO.DirectoryInfo fi = new System.IO.DirectoryInfo(this.RealPath);

            if (fi.Exists)
            {
                fi.Delete(true);
            }
        }

        public string RealPath
        {
            get
            {
                return this.Url.IsNullOrEmpty() ? string.Empty : string.Format("{0}/{1}", HttpRuntime.AppDomainAppPath, this.Url);
            }
        }

        public string VirtualPath
        {
            get
            {
                return UrlHelper.GenerateContentUrl("~/" + this.Url, HttpContext.Current.Request.RequestContext.HttpContext);
            }
        }

        public object ToJson()
        {
            long size = 0;
            try
            {
                string path = this.RealPath;
                FileInfo fi = new FileInfo(path);
                size = fi.Exists ? fi.Length : 0;
            }
            catch
            { }

            return new
            {
                this.ID,
                this.Name,
                this.Url,
                this.CreateDate,
                this.ChangeDate,
                this.CreatorID,
                this.ChangerID,
                Size = size,
                this.ParentID,
                this.ProjectID,
                this.Level,
                this.TreeString,
                this.FullName
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
            try
            {
                BuildingEntities db = (BuildingEntities)e.Context;
                var child = this.ChildFolders.ToList();
                foreach (var item in child)
                {
                    EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "Folders", "Folder", item, EntityJs.Client.Events.ActionsEnum.Delete);
                    item.OnDeleting(args);
                    db.DeleteObject(item);
                    item.OnDeleted(args);
                }
                var files = this.Files.ToList();
                foreach (var item in files)
                {
                    EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "Files", "File", item, EntityJs.Client.Events.ActionsEnum.Delete);
                    item.OnDeleting(args);
                    db.DeleteObject(item);
                    item.OnDeleted(args);
                }
            }
            catch (Exception ex)
            {
                new Log().Error(ex);
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            Folder parent = this.ParentFolder;
            if (parent != null && parent.Url.IsNullOrEmpty())
            {
                parent.FillUrl();
            }
            this.Url = "";
            this.Name = this.Name.Replace(System.IO.Path.GetInvalidFileNameChars(), "_");
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            this.Name = this.Name.Replace(System.IO.Path.GetInvalidFileNameChars(), "_");
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
            try
            {
                this.RemoveFolder();
            }
            catch (Exception ex)
            {
                new Log().Error(ex);
            }
        }

        public void FillUrl()
        {
            string prefix = string.Format("UploadedFiles/ProjectFiles/Project_{0}", this.ProjectID);
            Folder parent = this.ParentFolder;
            if (parent != null)
            {
                if (parent.Url.IsNullOrEmpty())
                    parent.FillUrl();
                prefix = parent.Url;
            }

            this.Url = string.Format("{0}/Folder_{1}", prefix, ID);
            //if (System.IO.Directory.Exists(this.RealPath))
            //{
            //    ((EntityJs.Client.Events.CheckPermissionsEventArgs)e).Result = OperationResultsEnum.OperationCanceled;
            //    ((EntityJs.Client.Events.CheckPermissionsEventArgs)e).Errors.Add("Folder already exists; " + Url);
            //    return;
            //}
            System.IO.Directory.CreateDirectory(this.RealPath);
        }
    }
}