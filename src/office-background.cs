    [DllImport("user32.dll", EntryPoint = "GetForegroundWindow")]
    static extern IntPtr OfficeForegroundWindow();

    // Some WPS installations return an existing process from CreateInstance
    // even when it was not published in the Running Object Table. That is not
    // evidence that the helper owns the application.
    static bool PptProcessAlreadyExists()
    {
        // WPS keeps service-only wps.exe processes after every window closes.
        // wpp.exe identifies an already running Presentation instance.
        string[] names = Suite == "wps" ? new string[] { "wpp" } : new string[] { "POWERPNT" };
        try
        {
            bool found = false;
            foreach (string name in names)
                foreach (System.Diagnostics.Process process in System.Diagnostics.Process.GetProcessesByName(name))
                    using (process) { found = true; }
            return found;
        }
        catch (Exception) { return true; } // Uncertain ownership never grants permission to quit.
    }

    static void ReleaseEmptyOwnedApp(string kind, dynamic app)
    {
        if ((int)Docs(kind, app).Count != 0) return;
        if (kind != "ppt" || Started.Contains(Key(kind)))
        {
            app.Quit(); Started.Remove(Key(kind));
            Trace("quit owned empty " + kind + " foreground " + OfficeForegroundWindow());
        }
        Own.Remove(Key(kind));
    }

    // Release one exact background document. This API is used by preview/save
    // transactions; it never operates on a document merely because it is active.
    static object ReleaseBackground(string kind, Bag a)
    {
        string target = a.Need("doc");
        dynamic app = OwnApp(kind, false);
        if (app == null) return "not owned";
        dynamic doc = Find(kind, app, target);
        if (doc == null) { ReleaseEmptyOwnedApp(kind, app); return "already closed"; }
        string full = (string)doc.FullName;
        if (!Hidden.Contains(full) || Revealed.Contains(full)) return "left open (user document)";
        bool watched = kind == "ppt" ? (int)doc.Windows.Count > 0 : Truthy(app.Visible);
        if (watched)
        {
            Hidden.Remove(full); Revealed.Add(full);
            return "left open (user has a document window)";
        }
        if (!Truthy(doc.Saved) && ((string)doc.Path).Length > 0)
        {
            if (kind == "word") FinishMath(doc);
            doc.Save();
        }
        Trace("release background " + kind + " foreground " + OfficeForegroundWindow());
        if (kind == "word") doc.Close(0);
        else if (kind == "excel") doc.Close(false);
        else { doc.Saved = -1; doc.Close(); }
        Hidden.Remove(full);
        // Visibility is not ownership: WPS can leave a visible empty shell
        // after closing its last windowless presentation.
        ReleaseEmptyOwnedApp(kind, app);
        return "released background document";
    }

    static object Settle()
    {
        List<object> said = new List<object>();
        try
        {
            foreach (string suite in Suites)
            foreach (string kind in new string[] { "word", "excel", "ppt" })
            {
                Suite = suite;
                dynamic app = OwnApp(kind, false);
                if (app == null) continue;
                List<string> mine = new List<string>();
                try { foreach (dynamic doc in Docs(kind, app)) if (Hidden.Contains((string)doc.FullName)) mine.Add((string)doc.FullName); }
                catch (Exception error) { said.Add("could not inspect " + AppName(kind) + ": " + error.Message.Trim()); continue; }
                foreach (string full in mine)
                {
                    try { said.Add(Convert.ToString(ReleaseBackground(kind, new Bag(new Dictionary<string, object> { { "doc", full } }))) + ": " + full); }
                    catch (Exception error)
                    {
                        // Retain both the ownership record and COM reference so
                        // a failed save can be retried or explicitly revealed.
                        said.Add("could not release " + full + ": " + error.Message.Trim());
                    }
                }
                try { ReleaseEmptyOwnedApp(kind, app); }
                catch (Exception) { } // The last release may already have quit this instance.
            }
        }
        finally
        {
            Suite = "office";
            GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect(); GC.WaitForPendingFinalizers();
            if (Own.Count == 0) { try { File.Delete(OwnNotePath()); } catch (Exception) { } }
        }
        return said;
    }
