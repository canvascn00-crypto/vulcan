"""
Adaptive Intent Recognition Engine for Vulcan
Classifies user input and maps it to the best-matching AI experts.
Pure Python rule-based classification — NO external API calls.
Fast (<10ms per classification), Bilingual (Chinese + English).
"""

import re
from typing import List, Dict, Tuple, Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# Intent Category Definitions
# =============================================================================
INTENT_CATEGORIES = [
    {
        "id": "code_development",
        "name": "代码开发 / Code Development",
        "keywords_zh": ["代码", "编程", "开发", "写代码", "程序", "函数", "类", "算法", "调试", "重构", "bug", "接口", "API", "SDK", "前端", "后端", "全栈", "软件", "程序员", "写程序", "代码", "python", "javascript", "java", "js", "ts", "编程语言", "实现", "功能"],
        "keywords_en": ["code", "programming", "develop", "build", "function", "class", "algorithm", "debug", "refactor", "frontend", "backend", "fullstack", "software", "implement", "coding", "programmer", "python", "javascript", "java"],
        "related_domains": ["software_engineering", "architecture"]
    },
    {
        "id": "data_analysis",
        "name": "数据分析 / Data Analysis",
        "keywords_zh": ["分析", "数据", "统计", "可视化", "图表", "报表", "洞察", "趋势", "挖掘", "ETL", "清洗"],
        "keywords_en": ["analysis", "data", "statistics", "visualization", "chart", "report", "insight", "trend", "mining", "etl", "clean"],
        "related_domains": ["data_science", "business_intelligence"]
    },
    {
        "id": "research",
        "name": "科研调研 / Research",
        "keywords_zh": ["研究", "调研", "调查", "文献", "论文", "学术", "探索", "综述", "实验", " hypothesis", "研究方法"],
        "keywords_en": ["research", "investigate", "survey", "literature", "paper", "academic", "explore", "review", "experiment", "hypothesis"],
        "related_domains": ["academic", "scientific_method"]
    },
    {
        "id": "business_analysis",
        "name": "商业分析 / Business Analysis",
        "keywords_zh": ["商业", "市场", "竞争", "战略", "商业模型", "盈利", "增长", "客户", "商业计划", "BP", "创业", "投资"],
        "keywords_en": ["business", "market", "competition", "strategy", "business model", "profit", "growth", "customer", "startup", "investment"],
        "related_domains": ["business", "strategy", "entrepreneurship"]
    },
    {
        "id": "content_creation",
        "name": "文案创作 / Content Creation",
        "keywords_zh": ["文案", "写作", "创作", "文章", "博客", "社媒", "营销", "推广", "软文", "文案", "标题", "脚本", "视频文案"],
        "keywords_en": ["content", "writing", "creation", "article", "blog", "social media", "marketing", "copy", "script", "text"],
        "related_domains": ["marketing", "creative"]
    },
    {
        "id": "image_generation",
        "name": "图像生成 / Image Generation",
        "keywords_zh": ["图片", "图像", "生成", "绘画", "插画", "海报", "logo", "图标", "设计", "AI绘图", "stable diffusion", "midjourney"],
        "keywords_en": ["image", "picture", "generation", "drawing", "illustration", "poster", "logo", "icon", "design", "ai art", "stable diffusion"],
        "related_domains": ["design", "generative_ai"]
    },
    {
        "id": "media_processing",
        "name": "音视频处理 / Media Processing",
        "keywords_zh": ["视频", "音频", "音乐", "剪辑", "配音", "字幕", "转码", "压缩", "提取", "语音", "TTS", "ASR"],
        "keywords_en": ["video", "audio", "music", "editing", "clip", "subtitle", "transcode", "compression", "extraction", "speech", "tts", "asr"],
        "related_domains": ["multimedia", "audio_engineering"]
    },
    {
        "id": "mathematics",
        "name": "数学计算 / Mathematics",
        "keywords_zh": ["数学", "计算", "公式", "方程", "微积分", "代数", "几何", "概率", "统计", "矩阵", "线性代数", "推导"],
        "keywords_en": ["math", "mathematics", "calculation", "formula", "equation", "calculus", "algebra", "geometry", "probability", "matrix"],
        "related_domains": ["mathematics", "physics"]
    },
    {
        "id": "security",
        "name": "安全审计 / Security",
        "keywords_zh": ["安全", "漏洞", "渗透", "黑客", "攻击", "防御", "加密", "解密", "权限", "认证", "审计", "威胁"],
        "keywords_en": ["security", "vulnerability", "penetration", "hack", "attack", "defense", "encryption", "decryption", "auth", "audit", "threat"],
        "related_domains": ["cybersecurity", "infosec"]
    },
    {
        "id": "devops",
        "name": "系统运维 / DevOps",
        "keywords_zh": ["运维", "部署", "发布", "上线", "CI/CD", "容器", "docker", "k8s", "kubernetes", "服务器", "监控", "日志"],
        "keywords_en": ["devops", "deployment", "release", "ci cd", "container", "docker", "kubernetes", "server", "monitoring", "logging"],
        "related_domains": ["infrastructure", "operations"]
    },
    {
        "id": "product_design",
        "name": "产品设计 / Product Design",
        "keywords_zh": ["产品", "设计", "原型", "PRD", "需求", "功能", "UX", "UI", "交互", "用户研究", "竞品"],
        "keywords_en": ["product", "design", "prototype", "prd", "requirement", "feature", "ux", "ui", "interaction", "user research"],
        "related_domains": ["product_management", "ux_design"]
    },
    {
        "id": "education",
        "name": "教育辅导 / Education",
        "keywords_zh": ["教育", "教学", "辅导", "学习", "课程", "教材", "讲解", "答疑", "作业", "考试", "培训"],
        "keywords_en": ["education", "teaching", "tutoring", "learning", "course", "lesson", "explanation", "homework", "exam", "training"],
        "related_domains": ["education", "pedagogy"]
    },
    {
        "id": "legal_compliance",
        "name": "法律合规 / Legal/Compliance",
        "keywords_zh": ["法律", "合规", "合同", "协议", "条款", "法规", "政策", "知识产权", "版权", "隐私", "GDPR"],
        "keywords_en": ["legal", "compliance", "contract", "agreement", "terms", "regulation", "policy", "ip", "copyright", "privacy"],
        "related_domains": ["legal", "compliance"]
    },
    {
        "id": "finance_quant",
        "name": "金融量化 / Finance/Quant",
        "keywords_zh": ["金融", "量化", "投资", "交易", "策略", "风控", "收益", "回测", "股票", "期货", "期权", "加密货币"],
        "keywords_en": ["finance", "quant", "investment", "trading", "strategy", "risk", "backtest", "stock", "futures", "options", "crypto"],
        "related_domains": ["finance", "quantitative_analysis"]
    },
    {
        "id": "game_development",
        "name": "游戏开发 / Game Development",
        "keywords_zh": ["游戏", "开发", "Unity", "Unreal", "关卡", "美术", "音效", "引擎", "物理", "AI", "NPC"],
        "keywords_en": ["game", "development", "unity", "unreal", "level", "art", "audio", "engine", "physics", "npc"],
        "related_domains": ["gaming", "interactive_entertainment"]
    },
    {
        "id": "embedded_iot",
        "name": "IoT/嵌入式 / Embedded Systems",
        "keywords_zh": ["嵌入式", "单片机", "ARM", "Arduino", "传感器", "RTOS", "物联网", "IoT", "固件", "电路", "PCB"],
        "keywords_en": ["embedded", "microcontroller", "arduino", "sensor", "rtos", "iot", "firmware", "circuit", "pcb", "arm"],
        "related_domains": ["electronics", "embedded_systems"]
    },
    {
        "id": "networking",
        "name": "网络架构 / Networking",
        "keywords_zh": ["网络", "协议", "TCP", "UDP", "HTTP", "DNS", "路由", "交换", "网关", "负载均衡", "SDN"],
        "keywords_en": ["network", "protocol", "tcp", "udp", "http", "dns", "router", "switch", "gateway", "load balancing", "sdn"],
        "related_domains": ["networking", "telecommunications"]
    },
    {
        "id": "database",
        "name": "数据库 / Database",
        "keywords_zh": ["数据库", "SQL", "NoSQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "索引", "查询", "事务", "ORM"],
        "keywords_en": ["database", "sql", "nosql", "mysql", "postgresql", "mongodb", "redis", "index", "query", "transaction", "orm"],
        "related_domains": ["data_engineering", "information_systems"]
    },
    {
        "id": "ml_ai",
        "name": "机器学习 / ML/AI",
        "keywords_zh": ["机器学习", "深度学习", "神经网络", "模型", "训练", "推理", "NLP", "CV", "强化学习", "TensorFlow", "PyTorch"],
        "keywords_en": ["machine learning", "deep learning", "neural network", "model", "training", "inference", "nlp", "cv", "reinforcement", "tensorflow", "pytorch"],
        "related_domains": ["artificial_intelligence", "data_science"]
    },
    {
        "id": "cloud_computing",
        "name": "云计算 / Cloud Computing",
        "keywords_zh": ["云", "云计算", "AWS", "Azure", "GCP", "Serverless", "Lambda", "弹性", "容器服务", "云原生", "云平台", "云服务器", "分布式", "集群"],
        "keywords_en": ["cloud", "aws", "azure", "gcp", "serverless", "lambda", "elastic", "container", "cloud native", "distributed", "cluster"],
        "related_domains": ["cloud_infrastructure", "distributed_systems"]
    },
    {
        "id": "technical_writing",
        "name": "技术文档 / Technical Writing",
        "keywords_zh": ["文档", "手册", "说明", "README", "API文档", "注释", "规范", "标准", "技术方案"],
        "keywords_en": ["documentation", "manual", "readme", "api doc", "comment", "specification", "standard", "technical writing"],
        "related_domains": ["technical_communication"]
    },
    {
        "id": "qa_testing",
        "name": "测试验证 / QA Testing",
        "keywords_zh": ["测试", "测试用例", "单元测试", "集成测试", "功能测试", "性能测试", "自动化测试", "回归"],
        "keywords_en": ["test", "testing", "unit test", "integration test", "functional test", "performance test", "automation", "regression"],
        "related_domains": ["quality_assurance", "software_engineering"]
    },
    {
        "id": "architecture_design",
        "name": "架构设计 / Architecture Design",
        "keywords_zh": ["架构", "设计模式", "微服务", "分布式", "高可用", "可扩展", "系统设计", "技术选型"],
        "keywords_en": ["architecture", "design pattern", "microservice", "distributed", "high availability", "scalable", "system design"],
        "related_domains": ["software_engineering", "system_architecture"]
    },
    {
        "id": "data_engineering",
        "name": "数据工程 / Data Engineering",
        "keywords_zh": ["数据工程", "数据管道", "数据湖", "数据仓库", "Spark", "Kafka", "流处理", "批处理"],
        "keywords_en": ["data engineering", "data pipeline", "data lake", "data warehouse", "spark", "kafka", "stream processing"],
        "related_domains": ["data_engineering", "information_architecture"]
    },
    {
        "id": "mobile_development",
        "name": "移动开发 / Mobile Development",
        "keywords_zh": ["移动", "iOS", "Android", "APP", "小程序", "React Native", "Flutter", "手机应用"],
        "keywords_en": ["mobile", "ios", "android", "app", "mini program", "react native", "flutter", "smartphone"],
        "related_domains": ["software_engineering", "mobile_platforms"]
    },
]

# Build a fast lookup dictionary
INTENT_LOOKUP = {cat["id"]: cat for cat in INTENT_CATEGORIES}


# =============================================================================
# Expert Registry (imported from registry.py when available)
# =============================================================================
DEFAULT_EXPERT_REGISTRY: Dict[str, Dict] = {
    "researcher": {
        "name": "Research Expert",
        "keywords": ["研究", "调研", "research", "investigate", "调查", "分析", "analyze", "研究分析", "市场调研"],
        "domains": ["research", "business_analysis", "data_analysis"],
        "skill_level": 0.8,
    },
    "coder": {
        "name": "Coding Expert",
        "keywords": ["代码", "编程", "开发", "build", "编程", "实现", "功能", "code", "开发", "programming"],
        "domains": ["code_development", "mobile_development", "game_development"],
        "skill_level": 0.9,
    },
    "tester": {
        "name": "Testing Expert",
        "keywords": ["测试", "test", "测试用例", "testing", "验证", "verify", "QA", "自动化测试"],
        "domains": ["qa_testing", "security"],
        "skill_level": 0.8,
    },
    "deployer": {
        "name": "DevOps/Deployment Expert",
        "keywords": ["部署", "deploy", "发布", "release", "上线", "CI/CD", "infrastructure", "devops", "运维"],
        "domains": ["devops", "cloud_computing", "networking"],
        "skill_level": 0.8,
    },
    "analyst": {
        "name": "Data Analysis Expert",
        "keywords": ["分析", "analyze", "analytics", "数据分析", "统计", "statistics", "数据", "数据处理", "挖掘"],
        "domains": ["data_analysis", "business_analysis", "finance_quant"],
        "skill_level": 0.85,
    },
    "reporter": {
        "name": "Reporting Expert",
        "keywords": ["报告", "report", "总结", "summary", "文档", "document", "文档编写", "documentation", "撰写", "写作"],
        "domains": ["content_creation", "technical_writing", "education"],
        "skill_level": 0.8,
    },
    "optimizer": {
        "name": "Optimization Expert",
        "keywords": ["优化", "optimize", "性能优化", "调优", "tuning", "improve", "提升", "enhance", "重构"],
        "domains": ["code_development", "database", "architecture_design"],
        "skill_level": 0.85,
    },
    "designer": {
        "name": "Design Expert",
        "keywords": ["设计", "design", "UI", "UX", "界面", "interface", "原型", "prototype", "wireframe", "产品"],
        "domains": ["product_design", "image_generation", "content_creation"],
        "skill_level": 0.85,
    },
    "security_expert": {
        "name": "Security Expert",
        "keywords": ["安全", "security", "漏洞", "vulnerability", "渗透", "penetration", "加密", "encryption", "审计"],
        "domains": ["security", "legal_compliance"],
        "skill_level": 0.9,
    },
    "data_engineer": {
        "name": "Data Engineering Expert",
        "keywords": ["数据", "data", "ETL", "pipeline", "数据流", "database", "数据库", "存储", "storage", "数据工程"],
        "domains": ["database", "data_engineering", "ml_ai"],
        "skill_level": 0.85,
    },
    "ml_expert": {
        "name": "ML/AI Expert",
        "keywords": ["机器学习", "深度学习", "模型", "训练", "AI", "人工智能", "神经网络", "NLP", "CV"],
        "domains": ["ml_ai", "data_analysis"],
        "skill_level": 0.9,
    },
    "cloud_expert": {
        "name": "Cloud Computing Expert",
        "keywords": ["云", "AWS", "Azure", "GCP", "cloud", "serverless", "容器", "kubernetes", "云原生"],
        "domains": ["cloud_computing", "devops", "networking"],
        "skill_level": 0.85,
    },
    "mobile_expert": {
        "name": "Mobile Development Expert",
        "keywords": ["iOS", "Android", "APP", "小程序", "移动", "React Native", "Flutter", "手机"],
        "domains": ["mobile_development", "code_development"],
        "skill_level": 0.85,
    },
    "game_expert": {
        "name": "Game Development Expert",
        "keywords": ["游戏", "Unity", "Unreal", "关卡", "美术", "引擎", "game", "开发"],
        "domains": ["game_development", "media_processing"],
        "skill_level": 0.85,
    },
    "iot_expert": {
        "name": "IoT/Embedded Expert",
        "keywords": ["嵌入式", "单片机", "IoT", "物联网", "传感器", "固件", "ARM", "电路"],
        "domains": ["embedded_iot", "networking"],
        "skill_level": 0.8,
    },
    "network_expert": {
        "name": "Networking Expert",
        "keywords": ["网络", "协议", "TCP", "HTTP", "路由", "交换", "DNS", "network", "安全"],
        "domains": ["networking", "security", "cloud_computing"],
        "skill_level": 0.85,
    },
    "legal_expert": {
        "name": "Legal/Compliance Expert",
        "keywords": ["法律", "合规", "合同", "协议", "条款", "法规", "legal", "compliance", "版权"],
        "domains": ["legal_compliance"],
        "skill_level": 0.9,
    },
    "finance_expert": {
        "name": "Finance/Quant Expert",
        "keywords": ["金融", "量化", "投资", "交易", "策略", "风控", "收益", "股票", "期货", "finance"],
        "domains": ["finance_quant", "data_analysis"],
        "skill_level": 0.9,
    },
    "math_expert": {
        "name": "Mathematics Expert",
        "keywords": ["数学", "计算", "公式", "方程", "微积分", "代数", "概率", "矩阵", "math"],
        "domains": ["mathematics", "ml_ai", "finance_quant"],
        "skill_level": 0.95,
    },
}


# =============================================================================
# Stopwords for keyword extraction
# =============================================================================
STOPWORDS_ZH = set([
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很",
    "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "那", "他", "她", "它",
    "们", "这个", "那个", "什么", "怎么", "如何", "为什么", "哪", "哪个", "哪些", "吗", "呢", "吧", "啊",
    "哦", "嗯", "唉", "哟", "嘿", "哈", "呀", "哇", "嘛", "啦", "得", "地", "而", "且", "并", "或者",
    "还是", "但是", "然而", "所以", "因为", "如果", "虽然", "除非", "当", "之前", "之后", "然后", "接着",
    "再", "又", "还", "已经", "正在", "将要", "可以", "能够", "应该", "必须", "需要", "想要", "希望",
    "帮忙", "帮助", "一下", "一点", "一些", "有点", "相当", "特别", "非常", "极", "最", "更", "太",
    "过", "挺", "蛮", "真", "实在", "简直", "果然", "原来", "本来", "当然", "果然", "居然", "竟然",
])

STOPWORDS_EN = set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "as", "is", "was", "are", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
    "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "what", "which",
    "who", "whom", "whose", "where", "when", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "just", "also", "now", "here", "there", "then", "once", "if", "though", "although", "because",
    "until", "while", "about", "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
])


# =============================================================================
# Pydantic Models
# =============================================================================
class IntentClassification(BaseModel):
    """Result of intent classification."""
    raw_input: str
    language: Literal["zh", "en", "mixed"]
    primary_intent: str
    secondary_intents: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    intent_keywords: List[str] = Field(default_factory=list)
    suggested_experts: List[Dict] = Field(default_factory=list)
    task_complexity: Literal["simple", "moderate", "complex", "very_complex"]
    decomposition_needed: bool
    suggested_strategy: Literal["single_expert", "parallel_experts", "sequential_chain", "hierarchical"]


# =============================================================================
# IntentEngine Class
# =============================================================================
class IntentEngine:
    """
    Adaptive intent recognition engine that classifies user input
    and maps it to the best-matching AI experts.
    """

    def __init__(self, expert_registry: Optional[Dict[str, Dict]] = None):
        """
        Initialize the IntentEngine.
        
        Args:
            expert_registry: Optional custom expert registry dict.
                            If not provided, uses DEFAULT_EXPERT_REGISTRY.
        """
        self.expert_registry = expert_registry or DEFAULT_EXPERT_REGISTRY
        self.intent_categories = INTENT_CATEGORIES
        self.intent_lookup = INTENT_LOOKUP
        self.stopwords_zh = STOPWORDS_ZH
        self.stopwords_en = STOPWORDS_EN

    def classify(self, user_input: str) -> IntentClassification:
        """
        Main entry point for classifying user input.
        
        Args:
            user_input: Raw user input string
            
        Returns:
            IntentClassification with all analyzed fields
        """
        # Step 1: Detect language
        language = self.detect_language(user_input)
        
        # Step 2: Extract keywords
        keywords = self.extract_keywords(user_input, top_k=20)
        
        # Step 3: Match against intent categories
        primary_intent, secondary_intents, confidence = self.match_intent(keywords)
        
        # Step 4: Suggest experts
        suggested_experts = self.suggest_experts(keywords, primary_intent, top_k=5)
        
        # Step 5: Determine task complexity and if decomposition is needed
        temp_classification = IntentClassification(
            raw_input=user_input,
            language=language,
            primary_intent=primary_intent,
            secondary_intents=secondary_intents,
            confidence=confidence,
            intent_keywords=keywords,
            suggested_experts=suggested_experts,
            task_complexity="simple",  # temp
            decomposition_needed=False,  # temp
            suggested_strategy="single_expert"  # temp
        )
        
        decomposition_needed, complexity = self.should_decompose(temp_classification)
        
        # Step 6: Suggest execution strategy
        # Estimate subtask count from intents and complexity
        subtask_count = self._estimate_subtask_count(
            primary_intent, secondary_intents, complexity, user_input
        )
        strategy = self.suggest_strategy(temp_classification, subtask_count)
        
        return IntentClassification(
            raw_input=user_input,
            language=language,
            primary_intent=primary_intent,
            secondary_intents=secondary_intents,
            confidence=confidence,
            intent_keywords=keywords,
            suggested_experts=suggested_experts,
            task_complexity=complexity,
            decomposition_needed=decomposition_needed,
            suggested_strategy=strategy
        )

    def detect_language(self, text: str) -> Literal["zh", "en", "mixed"]:
        """
        Detect language using character set analysis.
        
        If >30% Chinese characters → "zh"
        If >30% English words → "en"  
        Otherwise → "mixed"
        """
        if not text:
            return "mixed"
        
        # Count Chinese characters (Unicode range for CJK)
        chinese_chars = 0
        total_chars = 0
        for char in text:
            if char.strip():
                total_chars += 1
                if '\u4e00' <= char <= '\u9fff':
                    chinese_chars += 1
        
        if total_chars == 0:
            return "mixed"
        
        chinese_ratio = chinese_chars / total_chars
        
        # Count English words (simple heuristic: sequences of a-zA-Z)
        english_words = len(re.findall(r'[a-zA-Z]+', text))
        # Estimate total words (rough: split by whitespace and punctuation)
        all_tokens = re.findall(r'\b\w+\b', text)
        total_words = len(all_tokens)
        
        if total_words == 0:
            return "mixed"
        
        english_ratio = english_words / total_words
        
        # Decision logic
        if chinese_ratio > 0.30:
            return "zh"
        elif english_ratio > 0.30:
            return "en"
        else:
            return "mixed"

    def extract_keywords(self, text: str, top_k: int = 20) -> List[str]:
        """
        Extract keywords from input.
        
        Chinese: character n-grams (2-3 chars) + word segmentation simulation
        English: simple tokenization + stemming
        Remove common stopwords in both languages.
        """
        if not text:
            return []
        
        language = self.detect_language(text)
        keywords = []
        
        # Always extract both Chinese and English keywords
        # to handle mixed content (e.g., Chinese text with English tech terms)
        zh_kw = self._extract_chinese_keywords(text)
        en_kw = self._extract_english_keywords(text)
        
        if language == "zh":
            # For Chinese, still include English tech terms
            keywords = zh_kw + en_kw
        elif language == "en":
            keywords = en_kw
        else:
            # Mixed: include both
            keywords = zh_kw + en_kw
        
        # Remove stopwords and short tokens
        keywords = [k for k in keywords 
                    if k.lower() not in self.stopwords_zh 
                    and k.lower() not in self.stopwords_en 
                    and len(k) > 1
                    and not k.isdigit()]
        
        # Return top-k
        return keywords[:top_k]

    def _extract_chinese_keywords(self, text: str) -> List[str]:
        """Extract Chinese keywords using smarter segmentation."""
        keywords = []
        
        # Extract English tokens that should be kept
        english_tokens = re.findall(r'[a-zA-Z]+', text)
        
        # Extract continuous Chinese segments
        chinese_segments = re.findall(r'[\u4e00-\u9fff]+', text)
        
        for segment in chinese_segments:
            # For each segment, extract meaningful bi-grams and tri-grams
            # that correspond to potential words
            segment_len = len(segment)
            if segment_len >= 2:
                # Generate character n-grams (only 2-grams and 3-grams that make sense)
                for i in range(segment_len - 1):
                    bigram = segment[i:i+2]
                    # Filter out common function words
                    if bigram not in ['的', '了', '在', '是', '和', '就', '不', '都', '一', '上', '也', '很']:
                        keywords.append(bigram)
            
            if segment_len >= 3:
                for i in range(segment_len - 2):
                    trigram = segment[i:i+3]
                    # Filter out common function words combinations
                    if not any(fw in trigram for fw in ['的', '了', '在', '是', '和', '就', '不', '都', '一', '上', '也', '很']):
                        keywords.append(trigram)
        
        # Add meaningful English tokens (programming languages, technical terms)
        en_whitelist = {'python', 'java', 'javascript', 'js', 'ts', 'api', 'rest', 'sql', 
                        'http', 'tcp', 'udp', 'dns', 'aws', 'azure', 'gcp', 'k8s', 'docker',
                        'git', 'linux', 'node', 'react', 'vue', 'angular', 'flutter', 'rust', 'go',
                        'pytorch', 'tensorflow', 'keras', 'keras', 'cnn', 'rnn', 'lstm'}
        for token in english_tokens:
            token_lower = token.lower()
            if token_lower in en_whitelist or len(token_lower) >= 3:
                keywords.append(token_lower)
        
        # Dedupe while preserving order
        seen = set()
        deduped = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                deduped.append(kw)
        
        return deduped

    def _extract_english_keywords(self, text: str) -> List[str]:
        """Extract English keywords using tokenization."""
        # Clean and lowercase
        text_lower = text.lower()
        
        # Simple tokenization
        tokens = re.findall(r'[a-z]+', text_lower)
        
        # Simple stemming (remove common suffixes)
        stemmed = []
        for token in tokens:
            if len(token) > 3:
                # Remove common suffixes
                if token.endswith('ing'):
                    token = token[:-3]
                elif token.endswith('tion'):
                    token = token[:-4]
                elif token.endswith('ness'):
                    token = token[:-4]
                elif token.endswith('ment'):
                    token = token[:-4]
                elif token.endswith('able') or token.endswith('ible'):
                    token = token[:-4]
                elif token.endswith('ly'):
                    token = token[:-2]
                elif token.endswith('ed') and len(token) > 5:
                    token = token[:-2]
                elif token.endswith('s') and not token.endswith('ss'):
                    token = token[:-1]
            stemmed.append(token)
        
        # Dedupe
        seen = set()
        deduped = []
        for t in stemmed:
            if t not in seen and len(t) > 2:
                seen.add(t)
                deduped.append(t)
        
        return deduped

    def match_intent(self, keywords: List[str]) -> Tuple[str, List[str], float]:
        """
        Match keywords against intent categories.
        
        Returns:
            Tuple of (primary_intent_id, secondary_intent_ids, confidence)
        """
        if not keywords:
            return "code_development", [], 0.3
        
        scores: Dict[str, float] = {}
        
        for category in self.intent_categories:
            score = 0.0
            category_keywords_zh = category.get("keywords_zh", [])
            category_keywords_en = category.get("keywords_en", [])
            
            for kw in keywords:
                kw_lower = kw.lower()
                # Check Chinese keywords
                for ck in category_keywords_zh:
                    if ck.lower() in kw_lower or kw_lower in ck.lower():
                        score += 1.5  # Chinese keyword match bonus
                        break
                # Check English keywords
                for ck in category_keywords_en:
                    if ck.lower() in kw_lower or kw_lower in ck.lower():
                        score += 1.5
                        break
            
            # Normalize by number of category keywords to prevent bias
            total_cat_kw = len(category_keywords_zh) + len(category_keywords_en)
            if total_cat_kw > 0:
                scores[category["id"]] = score / (total_cat_kw ** 0.5)
            else:
                scores[category["id"]] = score
        
        # Sort by score descending
        sorted_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_intents or sorted_intents[0][1] == 0:
            return "code_development", [], 0.3
        
        primary_intent = sorted_intents[0][0]
        primary_score = sorted_intents[0][1]
        
        # Secondary intents: next 2-3 with significant scores
        secondary = []
        for intent_id, score in sorted_intents[1:4]:
            if score > 0 and score >= primary_score * 0.5:
                secondary.append(intent_id)
        
        # Confidence: normalize score to 0-1 range
        # Rough heuristic: score of 3+ is high confidence
        confidence = min(1.0, primary_score / 3.0)
        if confidence < 0.3 and primary_score > 0:
            confidence = 0.3  # Minimum confidence
        
        return primary_intent, secondary, confidence

    def suggest_experts(
        self, 
        keywords: List[str], 
        intent: str, 
        top_k: int = 5
    ) -> List[Dict]:
        """
        Suggest best-matched experts based on keywords and intent.
        
        Scoring:
        - Keyword overlap: 60%
        - Domain match: 25%
        - Skill level: 15%
        
        Returns:
            List of expert suggestions with match_score and reason
        """
        if not keywords:
            return []
        
        expert_scores: Dict[str, Dict] = {}
        
        for expert_id, expert_config in self.expert_registry.items():
            # Calculate keyword overlap (60% weight)
            expert_keywords = expert_config.get("keywords", [])
            kw_overlap = 0
            matched_kw = []
            for kw in keywords:
                kw_lower = kw.lower()
                for ek in expert_keywords:
                    if kw_lower in ek.lower() or ek.lower() in kw_lower:
                        kw_overlap += 1
                        matched_kw.append(ek)
                        break
            
            # Normalize keyword score
            max_possible_kw = min(len(keywords), len(expert_keywords))
            kw_score = kw_overlap / max_possible_kw if max_possible_kw > 0 else 0
            
            # Domain match (25% weight)
            expert_domains = expert_config.get("domains", [])
            category = self.intent_lookup.get(intent, {})
            category_domains = category.get("related_domains", [])
            
            domain_match = 0
            for ed in expert_domains:
                if ed in category_domains:
                    domain_match += 1
            
            domain_score = domain_match / len(category_domains) if category_domains else 0
            
            # Skill level (15% weight)
            skill_level = expert_config.get("skill_level", 0.7)
            
            # Combined weighted score
            combined_score = (
                kw_score * 0.60 +
                domain_score * 0.25 +
                skill_level * 0.15
            )
            
            # Build reason
            reason_parts = []
            if matched_kw:
                reason_parts.append(f"关键词匹配: {', '.join(matched_kw[:3])}")
            if domain_match > 0:
                reason_parts.append(f"领域匹配: {domain_match}项")
            reason_parts.append(f"技能水平: {skill_level:.0%}")
            
            expert_scores[expert_id] = {
                "expert_id": expert_id,
                "name": expert_config["name"],
                "match_score": round(combined_score, 3),
                "reason": "; ".join(reason_parts),
                "kw_score": kw_score,
                "domain_score": domain_score,
                "skill_level": skill_level,
            }
        
        # Sort by match_score descending
        sorted_experts = sorted(
            expert_scores.values(), 
            key=lambda x: x["match_score"], 
            reverse=True
        )
        
        # Return top-k with required fields only
        result = []
        for exp in sorted_experts[:top_k]:
            result.append({
                "expert_id": exp["expert_id"],
                "name": exp["name"],
                "match_score": exp["match_score"],
                "reason": exp["reason"]
            })
        
        return result

    def should_decompose(self, intent: IntentClassification) -> Tuple[bool, str]:
        """
        Determine if task decomposition is needed.
        
        Logic:
        - Simple (<5 keywords, single intent, short input) → no decomposition
        - Moderate (2 intents OR medium length) → maybe, let user decide
        - Complex (3+ intents OR long input OR compound sentences) → yes
        - Very complex (very long OR "帮我完成X并Y然后Z" pattern) → definitely yes
        """
        raw_input = intent.raw_input
        num_keywords = len(intent.intent_keywords)
        num_intents = 1 + len(intent.secondary_intents)
        input_length = len(raw_input)
        
        # Check for compound sentence patterns (X并Y然后Z)
        compound_patterns = [
            r'并[且和]',
            r'然后',
            r'接着',
            r'之后',
            r'再[做把]',
            r'并且',
            r'同时',
            r'而且',
            r'\band\b.*\band\b',
            r'\bthen\b',
            r'\bafter that\b',
            r'\bsubsequently\b',
        ]
        
        compound_count = 0
        for pattern in compound_patterns:
            if re.search(pattern, raw_input, re.IGNORECASE):
                compound_count += 1
        
        # Very complex indicators
        very_complex_indicators = [
            input_length > 500,
            compound_count >= 3,
            num_intents >= 4,
            num_keywords > 15,
        ]
        
        if any(very_complex_indicators):
            return True, "very_complex"
        
        # Complex indicators
        complex_indicators = [
            num_intents >= 3,
            input_length > 200,
            compound_count >= 2,
            num_keywords >= 10,
        ]
        
        if any(complex_indicators):
            return True, "complex"
        
        # Moderate indicators
        moderate_indicators = [
            num_intents == 2,
            input_length > 100,
            num_keywords >= 5,
        ]
        
        if any(moderate_indicators):
            return True, "moderate"  # or False with user confirmation
        
        # Simple: no decomposition needed
        return False, "simple"

    def suggest_strategy(
        self, 
        intent: IntentClassification, 
        subtask_count: int
    ) -> Literal["single_expert", "parallel_experts", "sequential_chain", "hierarchical"]:
        """
        Suggest execution strategy based on intent and subtask count.
        
        Logic:
        - 1 subtask → single_expert
        - 2-4 independent subtasks → parallel_experts
        - Subtasks with dependencies → sequential_chain
        - Multiple levels of tasks (main + sub) → hierarchical
        """
        raw_input = intent.raw_input.lower()
        
        # Check for hierarchical patterns (main goal + sub-tasks explicitly)
        hierarchical_patterns = [
            r'首先.*然后',
            r'第一步.*第二步',
            r'主要.*其次',
            r'总体.*分别',
            r'首先.*接着',
            r'overall.*then',
            r'first.*second.*third',
            r'main.*sub',
        ]
        
        has_hierarchical = any(re.search(p, raw_input) for p in hierarchical_patterns)
        
        # Check for sequential/dependency indicators
        sequential_patterns = [
            r'先.*再',
            r'之前.*之后',
            r'等.*完成',
            r'依赖于',
            r'取决于',
            r'在.*基础上',
            r'before.*after',
            r'after.*completing',
            r'once.*done',
        ]
        
        has_sequential = any(re.search(p, raw_input) for p in sequential_patterns)
        
        # Determine strategy
        if subtask_count == 1:
            return "single_expert"
        elif subtask_count > 4 or has_hierarchical:
            return "hierarchical"
        elif subtask_count <= 4 and has_sequential:
            return "sequential_chain"
        elif subtask_count >= 2:
            return "parallel_experts"
        else:
            return "single_expert"

    def _estimate_subtask_count(
        self, 
        primary_intent: str, 
        secondary_intents: List[str], 
        complexity: str,
        raw_input: str
    ) -> int:
        """Estimate the number of subtasks based on intents and complexity."""
        base_count = 1
        
        # Add for each secondary intent
        base_count += len(secondary_intents)
        
        # Complexity multiplier
        complexity_multiplier = {
            "simple": 1,
            "moderate": 1.5,
            "complex": 2,
            "very_complex": 3,
        }
        
        # Check for explicit subtask indicators
        subtask_patterns = [
            r'第一[步件点项个]',
            r'第二[步件点项个]',
            r'第三[步件点项个]',
            r'首先',
            r'然后',
            r'接着',
            r'最后',
            r'first',
            r'second',
            r'third',
            r'finally',
            r'step[123]',
            r'task[123]',
        ]
        
        explicit_count = 0
        for pattern in subtask_patterns:
            explicit_count += len(re.findall(pattern, raw_input))
        
        estimated = int(base_count * complexity_multiplier.get(complexity, 1))
        estimated = max(estimated, explicit_count)
        
        return max(1, min(estimated, 10))  # Cap at 10


# =============================================================================
# Convenience function for quick classification
# =============================================================================
def classify_intent(user_input: str) -> IntentClassification:
    """
    Quick function to classify user input without instantiating IntentEngine.
    """
    engine = IntentEngine()
    return engine.classify(user_input)


# =============================================================================
# Example usage and testing
# =============================================================================
if __name__ == "__main__":
    # Test cases
    test_inputs = [
        "帮我写一个Python函数来计算斐波那契数列",
        "I need help building a REST API with Node.js and Express",
        "分析一下我们公司Q3的销售数据，做成图表展示",
        "帮我写一个深度学习模型用于图像分类，使用PyTorch",
        "我想做一个电商APP，需要iOS和Android两个版本",
    ]
    
    engine = IntentEngine()
    
    for inp in test_inputs:
        print(f"\n{'='*60}")
        print(f"Input: {inp}")
        result = engine.classify(inp)
        print(f"Language: {result.language}")
        print(f"Primary Intent: {result.primary_intent}")
        print(f"Secondary Intents: {result.secondary_intents}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Keywords: {result.intent_keywords[:5]}...")
        print(f"Complexity: {result.task_complexity}")
        print(f"Decomposition: {result.decomposition_needed}")
        print(f"Strategy: {result.suggested_strategy}")
        print(f"Top Expert: {result.suggested_experts[0]['name'] if result.suggested_experts else 'N/A'}")
