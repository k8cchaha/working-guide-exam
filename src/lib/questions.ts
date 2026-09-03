export type QuestionType = 'single' | 'multiple' | 'short_answer'

export interface Option {
  id: string
  text: string
  isCorrect: boolean
}

export interface Question {
  id: string
  type: QuestionType
  isBonus: boolean
  points: number
  text: string
  options?: Option[]
  /** 問答題評分參考，僅顯示於 Admin */
  gradingHint?: string
}

export const QUESTIONS: Question[] = [
  // ── 單選題 25 題（每題 3 分）──────────────────────────────────────────
  {
    id: 'SC01',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Scrum Board 的主要用途是？',
    options: [
      { id: 'A', text: '呈現整體部署狀態，適合 PO / QA 掌握全局進度', isCorrect: false },
      { id: 'B', text: '以開發衝刺為核心，追蹤每個 Sprint 的功能進度', isCorrect: true },
      { id: 'C', text: '管理 Epic 與需求單之間的階層關係', isCorrect: false },
    ],
  },
  {
    id: 'SC02',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Jira 任務階層中，哪一層是「記錄開發執行」的？',
    options: [
      { id: 'A', text: 'Epic', isCorrect: false },
      { id: 'B', text: 'Story / Task / Bug（母單）', isCorrect: false },
      { id: 'C', text: 'DEV-Task / QA-Task（子單）', isCorrect: true },
    ],
  },
  {
    id: 'SC03',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Feature Bug 應該掛在哪個層級下？',
    options: [
      { id: 'A', text: 'Story 下方（作為子任務）', isCorrect: false },
      { id: 'B', text: 'Epic 下方（與 Story 平行）', isCorrect: true },
      { id: 'C', text: 'Task 下方（與 DEV-Task 平行）', isCorrect: false },
    ],
  },
  {
    id: 'SC04',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story Points 的最小填寫單位是？',
    options: [
      { id: 'A', text: '0.5', isCorrect: false },
      { id: 'B', text: '1', isCorrect: false },
      { id: 'C', text: '0.1', isCorrect: true },
    ],
  },
  {
    id: 'SC05',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story Points 應在何時填入？',
    options: [
      { id: 'A', text: 'SPEC 不清楚時，用於早期決策', isCorrect: false },
      { id: 'B', text: 'Sprint 啟動前，用於 Sprint 評估範圍', isCorrect: true },
      { id: 'C', text: '任務完成後立即填入', isCorrect: false },
    ],
  },
  {
    id: 'SC06',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Actual Story Points 應填寫在哪個層級？',
    options: [
      { id: 'A', text: 'Epic', isCorrect: false },
      { id: 'B', text: 'Story / Task / Bug（母單）', isCorrect: false },
      { id: 'C', text: 'DEV-Task / QA-Task（子單）', isCorrect: true },
    ],
  },
  {
    id: 'SC07',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story 與 Task 最核心的差異是？',
    options: [
      { id: 'A', text: 'Story 有截止日期，Task 沒有', isCorrect: false },
      { id: 'B', text: 'Story 需要環境驗證，Task 不需要', isCorrect: true },
      { id: 'C', text: 'Story 只能 RD 建立，Task 只能 PM 建立', isCorrect: false },
    ],
  },
  {
    id: 'SC08',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story 的結束條件（Done）是？',
    options: [
      { id: 'A', text: '所有 DEV-Task 都完成（Done）', isCorrect: false },
      { id: 'B', text: 'Reviewer 確認後手動關閉', isCorrect: false },
      { id: 'C', text: 'QA 在 Prod 環境驗證通過', isCorrect: true },
    ],
  },
  {
    id: 'SC09',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Task 的結束條件（Done）是？',
    options: [
      { id: 'A', text: 'QA 在 QA 環境驗證通過', isCorrect: false },
      { id: 'B', text: '所有子單都進入 Done 狀態', isCorrect: false },
      { id: 'C', text: 'Reviewer 確認後手動關閉', isCorrect: true },
    ],
  },
  {
    id: 'SC10',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '建立一張 Story 時，Automation 預設會產生幾張子單？',
    options: [
      { id: 'A', text: '1 張（DEV-Task）', isCorrect: false },
      { id: 'B', text: '2 張（DEV-Task + QA-Task）', isCorrect: false },
      { id: 'C', text: '3 張（DEV-Task + QA-Task × 2）', isCorrect: true },
    ],
  },
  {
    id: 'SC11',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '建立一張 Task 時，Automation 預設會產生哪些子單？',
    options: [
      { id: 'A', text: '僅 DEV-Task', isCorrect: true },
      { id: 'B', text: 'DEV-Task + QA-Task', isCorrect: false },
      { id: 'C', text: 'DEV-Task + QA-Task × 2', isCorrect: false },
    ],
  },
  {
    id: 'SC12',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '有 GitLab MR 連動時，DEV-Task 從「In Progress → In Review」的觸發方式是？',
    options: [
      { id: 'A', text: '手動切換', isCorrect: false },
      { id: 'B', text: 'MR 被 Merged 時自動觸發', isCorrect: false },
      { id: 'C', text: 'MR 被 Create 時自動觸發', isCorrect: true },
    ],
  },
  {
    id: 'SC13',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '有 GitLab MR 連動時，DEV-Task 從「In Review → Done」的觸發方式是？',
    options: [
      { id: 'A', text: 'MR Create 時自動觸發', isCorrect: false },
      { id: 'B', text: 'MR Merged 時自動觸發', isCorrect: true },
      { id: 'C', text: '手動切換', isCorrect: false },
    ],
  },
  {
    id: 'SC14',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story 母單從「In Progress」自動切換到「Dev Ready」的觸發條件是？',
    options: [
      { id: 'A', text: '任一 DEV-Task 進入 In Progress', isCorrect: false },
      { id: 'B', text: '所有 DEV-Task 都完成（Done）', isCorrect: true },
      { id: 'C', text: '程式碼部署至 QA 環境', isCorrect: false },
    ],
  },
  {
    id: 'SC15',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Story 母單的「QA Verified」狀態切換方式是？',
    options: [
      { id: 'A', text: '全自動：所有 QA-Task Done 後自動觸發', isCorrect: false },
      { id: 'B', text: '手動：QA 在環境驗證通過後手動操作', isCorrect: true },
      { id: 'C', text: '半自動：Deploy 後系統提示，QA 確認即可', isCorrect: false },
    ],
  },
  {
    id: 'SC16',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Task 母單從「In Review → Done」的方式是？',
    options: [
      { id: 'A', text: '所有 DEV-Task Done 後自動觸發', isCorrect: false },
      { id: 'B', text: '部署至 Prod 後自動觸發', isCorrect: false },
      { id: 'C', text: '手動：Reviewer 驗證確認後操作', isCorrect: true },
    ],
  },
  {
    id: 'SC17',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Spike 研究型任務應使用哪種母單類型建立？',
    options: [
      { id: 'A', text: 'Story', isCorrect: false },
      { id: 'B', text: 'Task', isCorrect: true },
      { id: 'C', text: 'Epic', isCorrect: false },
    ],
  },
  {
    id: 'SC18',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Bug 的 DoR（Definition of Ready）必要條件包含哪些？',
    options: [
      { id: 'A', text: '明確的 SPEC & A/C 與設計連結', isCorrect: false },
      { id: 'B', text: '重現條件（環境/版本、帳號/權限）、截圖/錄影、驗證標準', isCorrect: true },
      { id: 'C', text: '預期的研究產出與進行方式', isCorrect: false },
    ],
  },
  {
    id: 'SC19',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Bug 母單的 Root Cause 與 Solution 未填寫時，會發生什麼事？',
    options: [
      { id: 'A', text: '母單會自動被標記為 Won\'t Do', isCorrect: false },
      { id: 'B', text: '即使子單都 Done，母單不會自動推進到 Dev Ready', isCorrect: true },
      { id: 'C', text: 'Jira 會自動發送通知提醒填寫', isCorrect: false },
    ],
  },
  {
    id: 'SC20',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Bug 無法重現時，RD 應如何處理？',
    options: [
      { id: 'A', text: '直接關閉，Resolution 選 Not a Bug', isCorrect: false },
      { id: 'B', text: 'Status 切換至 Reproduce，Assign 回 QA', isCorrect: true },
      { id: 'C', text: 'Status 切換至 Request Info，Assign 給 PM', isCorrect: false },
    ],
  },
  {
    id: 'SC21',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Feature Bug 由其他 RD 協助修復時，Bug 母單的 Assignee 應該是誰？',
    options: [
      { id: 'A', text: '協助修復的 RD', isCorrect: false },
      { id: 'B', text: '原始開發者', isCorrect: true },
      { id: 'C', text: 'PM（負責追蹤）', isCorrect: false },
    ],
  },
  {
    id: 'SC22',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Bug 被 ReOpen 後，應如何進行修復？',
    options: [
      { id: 'A', text: '在原有的 DEV-Task 上繼續修復', isCorrect: false },
      { id: 'B', text: '直接修改原 Bug 單的狀態', isCorrect: false },
      { id: 'C', text: '建立新的 DEV-Task 來進行修復', isCorrect: true },
    ],
  },
  {
    id: 'SC23',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '母單「異常結束」時，Resolution 欄位何時才會出現？',
    options: [
      { id: 'A', text: '在單建立時就可以填寫', isCorrect: false },
      { id: 'B', text: 'Status 切換至 Done 之後才出現', isCorrect: true },
      { id: 'C', text: '需要 Admin 權限才能操作', isCorrect: false },
    ],
  },
  {
    id: 'SC24',
    type: 'single',
    isBonus: false,
    points: 3,
    text: 'Sprint 中 PM 有緊急需求需要插單時，應該優先做什麼？',
    options: [
      { id: 'A', text: '直接將需求單加入當前 Sprint', isCorrect: false },
      { id: 'B', text: '先於 Slack 或 Daily 主動告知 RD 團隊', isCorrect: true },
      { id: 'C', text: '先等到下個 Sprint 規劃會議再討論', isCorrect: false },
    ],
  },
  {
    id: 'SC25',
    type: 'single',
    isBonus: false,
    points: 3,
    text: '關於 Sprint 並存，以下何者正確？',
    options: [
      { id: 'A', text: 'Scrum Board 同時存在多個 Sprint 是異常現象，需立即處理', isCorrect: false },
      { id: 'B', text: '每個 Sprint 應在到期時強制關閉，未完成的票移到下個 Sprint', isCorrect: false },
      { id: 'C', text: 'Scrum Board 同時存在多個 Sprint 是正常現象，等所有需求都 Done 才 Complete', isCorrect: true },
    ],
  },

  // ── 複選題 2 題（每題最高 5 分，每選項 1 分）──────────────────────────
  {
    id: 'MC01',
    type: 'multiple',
    isBonus: false,
    points: 5,
    text: '以下關於 Actual Story Points 的敘述，哪些是正確的？（每個選項各 1 分，請選出所有正確的）',
    options: [
      { id: 'A', text: '最小單位是 0.1', isCorrect: true },
      { id: 'B', text: '應在每張 DEV-Task 完成後立即填入', isCorrect: true },
      { id: 'C', text: '母單可以手動修改 Actual Story Points', isCorrect: false },
      { id: 'D', text: '可透過 EP Tool 在 MR description 中填入來自動回填', isCorrect: true },
      { id: 'E', text: 'Resolution 為 Duplicate 的票，若有花費時間，建議仍記錄點數', isCorrect: true },
    ],
  },
  {
    id: 'MC02',
    type: 'multiple',
    isBonus: false,
    points: 5,
    text: '以下哪些情況下，子單（DEV-Task）的狀態切換是「手動」進行的？（每個選項各 1 分，請選出所有正確的）',
    options: [
      { id: 'A', text: '無 MR 連動時，In Progress → In Review', isCorrect: true },
      { id: 'B', text: '無 MR 連動時，In Review → Done', isCorrect: true },
      { id: 'C', text: '有 MR 連動時，Open → In Progress', isCorrect: true },
      { id: 'D', text: '有 MR 連動時，In Progress → In Review', isCorrect: false },
      { id: 'E', text: '有 MR 連動時，In Review → Done', isCorrect: false },
    ],
  },

  // ── 問答題 1 題（15 分，Admin 手動評分）──────────────────────────────
  {
    id: 'SA01',
    type: 'short_answer',
    isBonus: false,
    points: 15,
    text: '請描述 Story 類型母單的完整狀態流程（從 Open 到 Done），並說明哪些狀態轉換是「自動」的、哪些需要「手動」操作，以及各自的觸發條件。',
    gradingHint: `滿分 15 分，評分參考：
• 完整流程（8 分）：Open → In Progress → Dev Ready → QA Ready → QA Verified → PREP Ready → PREP Verified → Prod Ready → Done
• 自動轉換說明（4 分）：
  - Open → In Progress：任一 DEV-Task 進入 In Progress
  - In Progress → Dev Ready：所有 DEV-Task Done
  - → QA / PREP / Prod Ready：程式碼部署至對應環境觸發
• 手動轉換說明（3 分）：QA Verified、PREP Verified 需 QA 在環境驗證通過後手動操作`,
  },

  // ── 加分題 2 題（每題 3 分，單選）────────────────────────────────────
  {
    id: 'BN01',
    type: 'single',
    isBonus: true,
    points: 3,
    text: '【加分題】QA-Task 中 Test Execution 的點數估算基準為何？',
    options: [
      { id: 'A', text: '20 個 Test Case ≈ 1 人天', isCorrect: false },
      { id: 'B', text: '35 個 Test Case ≈ 1 人天', isCorrect: true },
      { id: 'C', text: '50 個 Test Case ≈ 1 人天', isCorrect: false },
    ],
  },
  {
    id: 'BN02',
    type: 'single',
    isBonus: true,
    points: 3,
    text: '【加分題】母單已進入 Deploy 階段後發生 SPEC Change，且來不及在 Release to PREP 前完成，應如何處理？',
    options: [
      { id: 'A', text: '保留已 merge 的程式碼，待下個 Sprint 補完邏輯', isCorrect: false },
      { id: 'B', text: '將已 merge 的半成品程式碼撤回，避免帶出未完成邏輯', isCorrect: true },
      { id: 'C', text: '將母單標記為 Won\'t Do，重新建立新的 Story', isCorrect: false },
    ],
  },
]

export function getQuestionById(id: string) {
  return QUESTIONS.find((q) => q.id === id)
}

/** 用 memberId 作為 seed，讓同一人每次刷新都看到相同順序，但不同人順序不同 */
export function shuffleQuestions(questions: Question[], seed: string): Question[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const arr = [...questions]
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const j = hash % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
