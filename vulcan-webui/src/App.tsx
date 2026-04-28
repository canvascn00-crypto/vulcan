import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ChatPage from '@/pages/ChatPage'
import WorkflowPage from '@/pages/WorkflowPage'
import SkillsPage from '@/pages/SkillsPage'
import MemoryPage from '@/pages/MemoryPage'
import ModelsPage from '@/pages/ModelsPage'
import AgentsPage from '@/pages/AgentsPage'
import DashboardPage from '@/pages/DashboardPage'
import WechatPage from '@/pages/WechatPage'
import SettingsPage from '@/pages/SettingsPage'
import ObservabilityPage from '@/pages/ObservabilityPage'
import EvolverPage from '@/pages/EvolverPage'
import MultimodalPage from '@/pages/MultimodalPage'
import ShieldPage from '@/pages/ShieldPage'
import DevtoolsPage from '@/pages/DevtoolsPage'
import OptimizerPage from '@/pages/OptimizerPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="wechat" element={<WechatPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* 新增模块 */}
        <Route path="observability" element={<ObservabilityPage />} />
        <Route path="evolver" element={<EvolverPage />} />
        <Route path="multimodal" element={<MultimodalPage />} />
        <Route path="shield" element={<ShieldPage />} />
        <Route path="devtools" element={<DevtoolsPage />} />
        <Route path="optimizer" element={<OptimizerPage />} />
      </Route>
    </Routes>
  )
}
