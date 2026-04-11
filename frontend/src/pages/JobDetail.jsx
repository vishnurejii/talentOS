import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { UploadCloud, CheckCircle2, Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function JobDetail() {
  const { id } = useParams()
  const user = useAuthStore(state => state.user)
  const [file, setFile] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.getJob(id).then(data => {
      setJob(data)
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setIsLoading(false)
    })
  }, [id])

  const handleApply = async (e) => {
    e.preventDefault()
    if (!file) {
      alert("Please select a CV (PDF) to upload first.")
      return
    }
    setIsApplying(true)
    try {
      await api.applyToJob(id, file)
      setApplied(true)
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsApplying(false)
    }
  }

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-white" /></div>
  if (!job) return <div className="p-20 text-center text-white">Job not found</div>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[30vw] h-[30vw] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
        
        <Link to="/jobs" className="text-indigo-400 text-sm hover:underline mb-6 inline-block">&larr; Back to jobs</Link>
        
        <h1 className="text-4xl font-bold text-white mb-2">{job.title}</h1>
        <div className="flex gap-3 mb-8">
          <span className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full border border-slate-700">{job.job_type}</span>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm rounded-full border border-emerald-500/20">Open</span>
        </div>
        
        <div className="prose prose-invert max-w-none mb-10">
          <h3 className="text-xl font-semibold mb-2">Description</h3>
          <p className="text-slate-400">{job.description}</p>
        </div>

        {user?.role === 'CANDIDATE' && !applied && (
          <form onSubmit={handleApply} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-xl font-semibold mb-4">Submit Application</h3>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer relative">
              <input type="file" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" />
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              {file ? (
                <p className="text-indigo-300 font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-slate-300 font-medium mb-1">Click or drag CV here</p>
                  <p className="text-slate-500 text-sm">Required format: PDF</p>
                </>
              )}
            </div>
            <button disabled={isApplying} className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 disabled:hover:scale-100 text-white font-medium py-3 rounded-xl transition-all hover:scale-[1.02]">
              {isApplying ? 'Uploading & Parsing...' : 'Apply Now'}
            </button>
          </form>
        )}

        {user?.role === 'CANDIDATE' && applied && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-emerald-300 mb-2">Application Submitted!</h3>
            <p className="text-emerald-400/80 mb-6">Your CV is being parsed by our AI. You will be notified when it's time for the exam.</p>
            <Link to="/dashboard" className="px-6 py-2 bg-emerald-500/20 text-emerald-200 rounded-lg hover:bg-emerald-500/30 transition-colors">Go to Dashboard</Link>
          </div>
        )}
      </div>
    </div>
  )
}
