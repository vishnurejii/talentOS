import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function CreateJob() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [jobType, setJobType] = useState('IT')
  const [skills, setSkills] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate()

  const handleCreate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
      await api.createJob({
        title,
        description,
        job_type: jobType,
        skills_required: skillsArray
      })
      navigate('/jobs')
    } catch (err) {
      console.error('Failed to create job:', err)
      alert('Error creating job: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 flex items-center justify-center relative overflow-hidden">
      <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-sm rounded-3xl p-8 relative z-10">
        <Link to="/jobs" className="text-blue-600 text-sm hover:underline mb-6 inline-block">&larr; Back to jobs</Link>
        <h1 className="text-3xl font-bold mb-8">Post a New Job</h1>
        
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 ml-1">Job Title</label>
            <input 
              required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
              placeholder="e.g. Senior Frontend Engineer" value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 ml-1">Job Type</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              value={jobType} onChange={e => setJobType(e.target.value)}
            >
              <option value="IT">IT (Coding Exam)</option>
              <option value="NON_IT">Non-IT (MCQ Exam)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 ml-1">Skills Required (comma separated)</label>
            <input 
              required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
              placeholder="React, Node.js, TypeScript" value={skills} onChange={e => setSkills(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 ml-1">Description</label>
            <textarea 
              required className="w-full h-32 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
              placeholder="Job responsibilities and requirements..." value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>

          <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-3 mt-4 transition-all shadow-lg flex justify-center items-center">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create and Trigger Exam Gen'}
          </button>
        </form>
      </div>
    </div>
  )
}
