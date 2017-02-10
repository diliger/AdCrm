using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class File : IEntity
    {
        public void RemoveFile()
        {
            System.IO.FileInfo fi = new System.IO.FileInfo(this.RealPath);

            if (fi.Exists)
            {
                fi.Delete();
            }
        }

        public string RealPath
        {
            get
            {
                return string.Format("{0}/{1}", HttpRuntime.AppDomainAppPath, this.Url);
            }
        }

        public string VirtualPath
        {
            get
            {
                return UrlHelper.GenerateContentUrl("~/" + this.Url, HttpContext.Current.Request.RequestContext.HttpContext);
            }
        }

        public string DownloadPath
        {
            get
            {
                string path = "~/File/" + this.ID + "/" + this.Name;
                return UrlHelper.GenerateContentUrl(path, HttpContext.Current.Request.RequestContext.HttpContext);
            }
        }

        public string ThumbnailPath
        {
            get
            {
                string path = "~/Data/ImageThumbnail/" + this.Name + "?FileID=" + this.ID;
                return UrlHelper.GenerateContentUrl(path, HttpContext.Current.Request.RequestContext.HttpContext);
            }
        }

        //public string GetThumbnailPath(int Width)
        //{
        //    string path = "~/Data/ImageThumbnail/" + this.Name + "?FileID=" + this.ID + "&Width=" + Width;
        //    return UrlHelper.GenerateContentUrl(path, HttpContext.Current.Request.RequestContext.HttpContext);
        //}

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
                this.DownloadPath,
                this.FolderID
                //this.ThumbnailPath
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;// e.Action == EntityJs.Client.Events.ActionsEnum.Delete;
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
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            this.Name = this.Name.Replace(System.IO.Path.GetInvalidFileNameChars(), "_");
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
            this.RemoveFile();
        }
    }
}