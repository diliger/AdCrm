using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Web;

namespace AdCrm.Code
{
    public sealed class EventWorker
    {
        private Thread Thread;
        private bool Started;
        private bool NeedStop;
        private Log Log;
        private TimeSpan Interval;
        private int ErrorsLimit = 5;

        private static volatile EventWorker worker;
        private static object locker = new Object();

        Dictionary<string, IWorker> Workers;

        private EventWorker()
        {
            Workers = new Dictionary<string, IWorker>();
            Thread = new Thread(new ThreadStart(WorkerMethod));
            Log = new Log();
            Interval = new TimeSpan(0, 1, 0);
        }

        public static EventWorker Worker
        {
            get
            {
                if (worker == null)
                {
                    lock (locker)
                    {
                        if (worker == null)
                            worker = new EventWorker();
                    }
                }

                return worker;
            }
        }

        public bool IsAlive
        {
            get
            {
                bool v = false;
                lock (locker)
                {
                    v = Started && Workers.Any();
                }
                return v;
            }
        }

        public void Start()
        {
            if (Started)
                return;
            lock (locker)
            {
                if (Started)
                    return;
                NeedStop = false;
                if (Thread.ThreadState != ThreadState.Unstarted)
                {
                    Thread = new Thread(new ThreadStart(WorkerMethod));
                }
                Thread.Start();
            }
        }
        public void Stop()
        {
            lock (locker)
            {
                NeedStop = true;
            }
        }
        public void RegisterWorker(IWorker Worker)
        {
            string key = Worker.GetHashCode().ToString();
            this.RegisterWorker(key, Worker);
        }
        public void RegisterWorker(string Key, IWorker Worker)
        {
            Workers[Key] = Worker;
        }

        private void WorkerMethod()
        {
            Started = true;
            try
            {
                //Log.Info(string.Format("WorkerMethod {0}", 1));
                while (!NeedStop)
                {
                    //Log.Info(string.Format("WorkerMethod {0}", 2));
                    Settings.SetValue("LastWorkerTick", DateTime.Now.ToString());
                    List<string> keys = Workers.Keys.ToList();
                    //Log.Info(string.Format("WorkerMethod {0}", 3));
                    for (int i = 0; i < keys.Count; i++)
                    {
                        IWorker w;
                        if (Workers.TryGetValue(keys[i], out w) && w != null)
                        {
                            //Log.Info(string.Format("WorkerMethod {0}", 4));
                            try
                            {
                                w.DoWork();
                                w.ErrorsCount = 0;
                                //Log.Info(string.Format("WorkerMethod {0}", 5));
                            }
                            catch (Exception ex)
                            {
                                //Log.Info(string.Format("WorkerMethod {0}", 6));
                                Log.Error(ex);
                                w.ErrorsCount++;
                            }
                            if (w.ErrorsCount > ErrorsLimit)
                            {
                                Log.Message(string.Format("The worker {0} exceeded errors limit ({1}) and was removed from workers stack", keys[i], ErrorsLimit));
                            }
                        }
                        //Log.Info(string.Format("WorkerMethod {0}", 7));
                    }

                    //Log.Info(string.Format("WorkerMethod {0}", 8));
                    this.SelfRequest();
                    //Log.Info(string.Format("WorkerMethod {0}", 9));
                    Thread.Sleep(Interval);
                    //Log.Info(string.Format("WorkerMethod {0}", 10));
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }
            finally
            {
                //Log.Info(string.Format("WorkerMethod {0}", 11));
                Started = false;
            }
        }

        private void SelfRequest()
        {
            try
            {
                System.Net.WebRequest.Create(AdCrm.MvcApplication.FullRootUrl).BeginGetResponse(new AsyncCallback(r => { }), null);
            }
            catch (Exception ex)
            {
            }
        }
    }

    public interface IWorker
    {
        void DoWork();
        int ErrorsCount { get; set; }
    }
}