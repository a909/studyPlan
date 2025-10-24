// Shared utilities for the Interview Assistant
const API_BASE = 'https://t-jxjyadmin.gaodun.com/api/v1/test';

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key) {
  const v = localStorage.getItem(key);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
}
function clearKeys(keys) { keys.forEach(k => localStorage.removeItem(k)); }

async function postJSON(endpoint, data, timeout = 10000) {
  const url = `${API_BASE}/${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { status: 0, info: 'Invalid JSON', raw: text }; }
    return { ok: res.ok, json };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

function parseQuestionDatas(q) {
  if (!q) return null;
  if (typeof q === 'string') {
    try { return JSON.parse(q); } catch { return null; }
  }
  if (typeof q === 'object') return q;
  return null;
}

function makeFallback(position = '通用岗位', jd = '') {
  const ks = ['背景', '技能', '项目', '优化', '总结'];
  const questions = [
    { keyword: ks[0], type: 'qa', id: 'F-QA-001', score: 20, title: `请简述你的过往经历背景，并结合「${position}」岗位的匹配点。`, options: [], correctAnswer: '' },
    { keyword: ks[1], type: 'qa', id: 'F-QA-002', score: 20, title: `围绕「核心技能」，列出你认为本岗位的关键能力与指标（参考JD：${jd ? '已提供' : '未提供'}）。`, options: [], correctAnswer: '' },
    { keyword: ks[2], type: 'qa', id: 'F-QA-003', score: 20, title: '选择一个代表性项目，说明目标、难点与你的职责，并给出核心方案。', options: [], correctAnswer: '' },
    { keyword: ks[3], type: 'qa', id: 'F-QA-004', score: 20, title: '描述一次性能或可用性优化实践：指标、瓶颈定位、改进措施与成效。', options: [], correctAnswer: '' },
    { keyword: ks[4], type: 'qa', id: 'F-QA-005', score: 20, title: '结合职业发展，说明你在团队协作、学习与成长上的规划。', options: [], correctAnswer: '' }
  ];
  return {
    randId: 'F-' + Math.random().toString(36).slice(2, 10),
    questionDatas: { keywords: ks, questions }
  };
}

function letterForIndex(i) {
  return String.fromCharCode('A'.charCodeAt(0) + i);
}

// 动态岗位题库：热门岗位 Top100（跨行业）
const POPULAR_ROLES = [
  '行政专员','行政经理','前台接待','办公室主任','人事专员','HR经理','招聘专员','培训专员','薪酬福利专员',
  '会计','出纳','财务主管','财务经理','税务专员','审计专员',
  '法务专员','合规经理','风险经理',
  '市场专员','市场经理','品牌经理','公关经理','活动策划','内容运营','新媒体运营','SEO专员','文案策划',
  '销售代表','销售经理','大客户经理','渠道经理','商务拓展','客户成功经理','客服专员','呼叫中心主管',
  '产品经理','项目经理','运营专员','运营经理','电商运营','店铺运营','供应链运营','数据运营',
  '采购专员','采购经理','供应链经理','计划专员','仓库主管','物流专员','配送调度',
  '生产经理','车间主任','工艺工程师','质量工程师','质量经理','设备维护工程师','维修技师','机修工','检验员','物料管理员','安全员',
  '房地产经纪人','物业经理','物业管家','建筑师','结构工程师','造价工程师','施工经理','监理工程师',
  '平面设计师','视觉设计师','品牌设计师','室内设计师','服装设计师','摄影师','视频剪辑师','UI设计师','UE设计师',
  '教师','班主任','教务专员','教学主管','培训讲师','教育咨询师',
  '护士','医生','药剂师','康复治疗师','检验技师','影像技师','医学助理','营养师',
  '酒店前台','酒店经理','客房主管','餐厅经理','厨师','西点师','咖啡师','调酒师'
];
function normalizeText(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
function difficultyFromSalary(salary) {
  const n = parseInt(String(salary || '').replace(/[^\d]/g, ''), 10) || 0;
  if (n < 8000) return 'junior';
  if (n <= 15000) return 'mid';
  if (n <= 50000) return 'senior';
  return 'expert';
}
function fuzzyMatchRole(input) {
  const normIn = normalizeText(input);
  let best = null, bestScore = 0;
  for (const role of POPULAR_ROLES) {
    const normRole = normalizeText(role);
    let score = 0;
    if (normIn && (normIn.includes(normRole) || normRole.includes(normIn))) {
      score = Math.min(normRole.length, normIn.length);
    } else {
      const tokens = role.split(/[\s\/\-·，、]/).filter(Boolean);
      tokens.forEach(t => { const nt = normalizeText(t); if (nt && normIn.includes(nt)) score += nt.length; });
    }
    if (score > bestScore) { best = role; bestScore = score; }
  }
  return best || (input || '通用岗位');
}

function getRoleCategory(role) {
  const r = normalizeText(role);
  const hasAny = (arr) => arr.some(k => r.includes(normalizeText(k)));
  if (hasAny(['行政','前台','办公室'])) return 'administration';
  if (hasAny(['人事','HR','招聘','培训','薪酬','福利'])) return 'hr';
  if (hasAny(['会计','出纳','财务','税务','审计'])) return 'finance';
  if (hasAny(['法务','合规','风险'])) return 'legal';
  if (hasAny(['市场','品牌','公关','活动','运营','新媒体','内容','SEO','文案'])) return 'marketing';
  if (hasAny(['销售','客户成功','客服','呼叫'])) return 'sales_service';
  if (hasAny(['产品','项目','运营','电商','店铺','数据运营'])) return 'product_ops';
  if (hasAny(['采购','供应链','计划','仓库','物流','配送'])) return 'procurement_supply';
  if (hasAny(['生产','车间','工艺','质量','设备','维修','机修','检验','物料','安全'])) return 'manufacturing';
  if (hasAny(['房地产','物业','建筑','结构','造价','施工','监理'])) return 'real_estate';
  if (hasAny(['设计','平面','视觉','品牌','室内','服装','摄影','剪辑','UI','UE'])) return 'design';
  if (hasAny(['教师','班主任','教务','教学','讲师','教育咨询'])) return 'education';
  if (hasAny(['护士','医生','药剂','康复','检验','影像','医学助理','营养'])) return 'healthcare';
  if (hasAny(['酒店','客房','餐厅','厨师','西点','咖啡','调酒'])) return 'hospitality';
  return 'general';
}

function generateRoleQuestionBank(role, position, jd) {
  const tag = jd ? 'JD：已提供' : 'JD：未提供';
  const R = (role || position || '通用岗位');
  const mk = (idx, diff, kw, title) => ({
    keyword: kw,
    type: 'qa',
    id: `${normalizeText(R).slice(0, 10).toUpperCase()}-${diff.toUpperCase()}-QA-${String(idx + 1).padStart(3, '0')}`,
    score: 20,
    title,
    options: [],
    correctAnswer: '',
    difficulty: diff
  });

  const cat = getRoleCategory(R);
  let keywords = [];
  let juniors = [], mids = [], seniors = [], experts = [];

  switch (cat) {
    case 'administration':
      keywords = ['行政流程','后勤保障','费用与制度','档案管理','供应商'];
      juniors = [
        mk(0,'junior','行政流程',`【初级】描述你参与的行政流程（考勤/会议/采购）与规范执行（${tag}）。`),
        mk(1,'junior','后勤保障','【初级】举例说明一次办公设备或环境保障的处理过程。'),
        mk(2,'junior','费用与制度','【初级】列举你熟悉的费用报销规则与注意事项。'),
        mk(3,'junior','档案管理','【初级】说明档案/合同的归档要点与权限控制。'),
        mk(4,'junior','供应商','【初级】说明你参与的库存盘点或补货建议。')
      ];
      mids = [
        mk(5,'mid','行政流程','【中级】提出一个流程优化建议（如会议室预订），说明效果与度量。'),
        mk(6,'mid','后勤保障','【中级】描述一次办公搬迁或装修协调的方案与风险控制。'),
        mk(7,'mid','费用与制度','【中级】制定或优化一项行政制度，并阐述落地要点。'),
        mk(8,'mid','档案管理','【中级】设计档案管理台账与审计追踪的做法。'),
        mk(9,'mid','供应商','【中级】说明供应商评估/比价策略与服务质量保障。')
      ];
      seniors = [
        mk(10,'senior','行政流程','【高级】围绕成本、效率与员工体验，设计行政运营指标体系。'),
        mk(11,'senior','后勤保障','【高级】制定应急预案（停电/消防/疫情）与演练机制。'),
        mk(12,'senior','费用与制度','【高级】构建费用控制框架（预算/审批/合规），并给出案例。'),
        mk(13,'senior','档案管理','【高级】在多部门协同下保障档案安全与合规审计。'),
        mk(14,'senior','供应商','【高级】建设供应商管理机制（准入/考核/淘汰）。')
      ];
      experts = [
        mk(15,'expert','行政流程','【专家】搭建行政共享服务中心，说明组织、流程与绩效。'),
        mk(16,'expert','后勤保障','【专家】制定设施与服务标准化体系并推动持续改进。'),
        mk(17,'expert','费用与制度','【专家】平衡成本与体验的行政战略与治理模型。'),
        mk(18,'expert','档案管理','【专家】设计企业级档案治理与风险控制方案。'),
        mk(19,'expert','供应商','【专家】建立长期合作伙伴计划与共赢机制。')
      ];
      break;
    case 'hr':
      keywords = ['招聘','培训与发展','绩效管理','薪酬福利','员工关系'];
      juniors = [
        mk(0,'junior','招聘','【初级】说明你执行的招聘流程（JD/筛选/面试安排）。'),
        mk(1,'junior','培训与发展','【初级】描述一次培训组织经历与反馈收集。'),
        mk(2,'junior','绩效管理','【初级】说明你了解的绩效评估维度与周期。'),
        mk(3,'junior','薪酬福利','【初级】说明你对薪酬福利政策的理解或参与过的调整。')
      ];
      mids = [
        mk(5,'mid','招聘','【中级】设计人才画像与渠道策略，衡量转化与成本。'),
        mk(6,'mid','培训与发展','【中级】搭建课程体系与评估模型（前/中/后效）。'),
        mk(7,'mid','绩效管理','【中级】制定绩效目标对齐与辅导机制。'),
        mk(8,'mid','薪酬福利','【中级】进行薪酬调研并提出结构优化建议。'),
        mk(9,'mid','员工关系','【中级】建立员工沟通与申诉通道，处理冲突。')
      ];
      seniors = [
        mk(10,'senior','招聘','【高级】构建招聘预测与人才库管理体系。'),
        mk(11,'senior','培训与发展','【高级】推动领导力发展与继任计划。'),
        mk(12,'senior','绩效管理','【高级】将绩效与组织目标/激励挂钩的实践。'),
        mk(13,'senior','薪酬福利','【高级】薪酬结构设计（等级/宽带）与合规风险。'),
        mk(14,'senior','员工关系','【高级】复杂劳动争议的处理与合规管理。')
      ];
      experts = [
        mk(15,'expert','招聘','【专家】打造雇主品牌与全链路体验。'),
        mk(16,'expert','培训与发展','【专家】建设学习型组织与知识管理体系。'),
        mk(17,'expert','绩效管理','【专家】绩效治理的文化与数据驱动方法。'),
        mk(18,'expert','薪酬福利','【专家】长期激励与总薪酬策略设计。'),
        mk(19,'expert','员工关系','【专家】复杂组织变革中的员工稳定与沟通。')
      ];
      break;
    case 'finance':
      keywords = ['账务处理','报表编制','税务合规','预算与费用','内控'];
      juniors = [
        mk(0,'junior','账务处理','【初级】说明你熟悉的账务处理流程与凭证规范。'),
        mk(1,'junior','报表编制','【初级】说明你参与的库存盘点或补货建议。'),
        mk(2,'junior','税务合规','【初级】说明你参与的库存盘点或补货建议。'),
        mk(3,'junior','预算与费用','【初级】描述费用报销与预算控制的基本做法。'),
        mk(4,'junior','内控','【初级】说明你执行的内控点与记录方法。')
      ];
      mids = [
        mk(5,'mid','账务处理','【中级】优化出纳与会计的衔接流程，减少差错。'),
        mk(6,'mid','报表编制','【中级】设计指标口径与核算规则以提升对比性。'),
        mk(7,'mid','税务合规','【中级】规划税务风险点与自查机制。'),
        mk(8,'mid','预算与费用','【中级】建立预算执行监控与偏差分析。'),
        mk(9,'mid','内控','【中级】完善内控流程并开展抽样审计。')
      ];
      seniors = [
        mk(10,'senior','账务处理','【高级】推动账务自动化与系统化改进。'),
        mk(11,'senior','报表编制','【高级】搭建管理报表用于经营决策。'),
        mk(12,'senior','税务合规','【高级】制定税务筹划方案与合规边界。'),
        mk(13,'senior','预算与费用','【高级】建立滚动预算与成本优化策略。'),
        mk(14,'senior','内控','【高级】构建内控框架与风险评估体系。')
      ];
      experts = [
        mk(15,'expert','账务处理','【专家】建设共享财务中心与流程再造。'),
        mk(16,'expert','报表编制','【专家】用数据驱动财务BP与经营洞察。'),
        mk(17,'expert','税务合规','【专家】复杂业务下的税务策略与争议应对。'),
        mk(18,'expert','预算与费用','【专家】总成本治理与投资回报评估体系。'),
        mk(19,'expert','内控','【专家】企业级内控与合规治理的实施。')
      ];
      break;
    case 'legal':
      keywords = ['合同审查','合规','风险控制','争议处理','制度建设'];
      juniors = [
        mk(0,'junior','合同审查','【初级】说明合同审查的关键条款与记录方法。'),
        mk(1,'junior','合规','【初级】说明你参与的合规培训或宣导。'),
        mk(2,'junior','风险控制','【初级】描述一次风险预警的发现与报告。'),
        mk(3,'junior','争议处理','【初级】说明你协助处理纠纷的流程与角色。'),
        mk(4,'junior','制度建设','【初级】说明制度文件的归档与版本管理。')
      ];
      mids = [
        mk(5,'mid','合同审查','【中级】提出合同模板优化建议并说明效果。'),
        mk(6,'mid','合规','【中级】建立合规检查点与自评机制。'),
        mk(7,'mid','风险控制','【中级】设计风险评估表与分级响应。'),
        mk(8,'mid','争议处理','【中级】梳理争议处理流程与取证要点。'),
        mk(9,'mid','制度建设','【中级】推进制度落地与培训覆盖。')
      ];
      seniors = [
        mk(10,'senior','合同审查','【高级】搭建合同生命周期管理体系。'),
        mk(11,'senior','合规','【高级】制定合规治理框架与监督机制。'),
        mk(12,'senior','风险控制','【高级】构建风险台账与预警信号系统。'),
        mk(13,'senior','争议处理','【高级】复杂纠纷的策略选择与资源协调。'),
        mk(14,'senior','制度建设','【高级】制度协调与跨部门协同治理。')
      ];
      experts = [
        mk(15,'expert','合同审查','【专家】企业合同治理与模板化体系建设。'),
        mk(16,'expert','合规','【专家】在行业监管变化下的合规策略。'),
        mk(17,'expert','风险控制','【专家】风险治理的组织与文化落地。'),
        mk(18,'expert','争议处理','【专家】重大争议的策略、沟通与复盘。'),
        mk(19,'expert','制度建设','【专家】制度体系的持续改进与评估。')
      ];
      break;
    case 'marketing':
      keywords = ['品牌与传播','活动与策划','内容与新媒体','渠道与投放','指标与复盘'];
      juniors = [
        mk(0,'junior','品牌与传播','【初级】描述一次品牌传播或素材制作参与。'),
        mk(1,'junior','活动与策划','【初级】说明你执行过的线下/线上活动流程。'),
        mk(2,'junior','内容与新媒体','【初级】描述你参与的内容发布或账号维护实践。'),
        mk(3,'junior','渠道与投放','【初级】说明你参与的渠道选择与基础投放操作。'),
        mk(4,'junior','指标与复盘','【初级】说明一次活动复盘的结构与结论。')
      ];
      mids = [
        mk(5,'mid','品牌与传播','【中级】制定品牌资产/口碑提升策略。'),
        mk(6,'mid','活动与策划','【中级】设计活动目标与预算，评估ROI。'),
        mk(7,'mid','内容与新媒体','【中级】制定内容栏目与编辑规范，规划节奏。'),
        mk(8,'mid','渠道与投放','【中级】优化渠道组合与投放策略。'),
        mk(9,'mid','指标与复盘','【中级】构建指标看板并推动迭代。')
      ];
      seniors = [
        mk(10,'senior','品牌与传播','【高级】品牌战略制定与跨部门协同。'),
        mk(11,'senior','活动与策划','【高级】大型活动统筹与风险管理。'),
        mk(12,'senior','内容与新媒体','【高级】建立内容生产与审核机制。'),
        mk(13,'senior','渠道与投放','【高级】多渠道协同与预算分配策略。'),
        mk(14,'senior','指标与复盘','【高级】战略复盘与业务洞察。')
      ];
      experts = [
        mk(15,'expert','品牌与传播','【专家】品牌长期战略与差异化定位。'),
        mk(16,'expert','活动与策划','【专家】整合营销与公关矩阵的构建。'),
        mk(17,'expert','内容与新媒体','【专家】内容生态系统与IP打造。'),
        mk(18,'expert','渠道与投放','【专家】数据驱动的投放决策与优化。'),
        mk(19,'expert','指标与复盘','【专家】营销度量体系与增长飞轮。')
      ];
      break;
    case 'sales_service':
      keywords = ['销售漏斗','客户管理','谈判成交','渠道/大客户','服务与体验'];
      juniors = [
        mk(0,'junior','销售漏斗','【初级】描述你的线索跟进与漏斗管理实践。'),
        mk(1,'junior','客户管理','【初级】说明客户分层与回访记录的方法。'),
        mk(2,'junior','谈判成交','【初级】描述你参与的报价与谈判过程。'),
        mk(3,'junior','渠道/大客户','【初级】说明你协同渠道或大客户的拜访与对接。'),
        mk(4,'junior','服务与体验','【初级】描述你在服务响应与满意度上的做法。')
      ];
      mids = [
        mk(5,'mid','销售漏斗','【中级】搭建漏斗指标与复盘节奏，优化转化。'),
        mk(6,'mid','客户管理','【中级】建立客户生命周期管理方法。'),
        mk(7,'mid','谈判成交','【中级】设计成交策略与让步边界，处理异议。'),
        mk(8,'mid','渠道/大客户','【中级】制定渠道拓展与大客户经营策略。'),
        mk(9,'mid','服务与体验','【中级】构建服务指标与改进闭环。')
      ];
      seniors = [
        mk(10,'senior','销售漏斗','【高级】实现数据驱动的销售预测与资源配置。'),
        mk(11,'senior','客户管理','【高级】建立客户成功机制与价值共创。'),
        mk(12,'senior','谈判成交','【高级】复杂场景下的谈判策略与协同配合。'),
        mk(13,'senior','渠道/大客户','【高级】大客户经营与关键关系维护。'),
        mk(14,'senior','服务与体验','【高级】服务战略与体验设计。')
      ];
      experts = [
        mk(15,'expert','销售漏斗','【专家】打造可持续增长的销售运营体系。'),
        mk(16,'expert','客户管理','【专家】高价值客户的经营与增值策略。'),
        mk(17,'expert','谈判成交','【专家】复杂博弈中的谈判框架与协同。'),
        mk(18,'expert','渠道/大客户','【专家】全球化渠道布局与治理。'),
        mk(19,'expert','服务与体验','【专家】企业级客户体验与声誉管理。')
      ];
      break;
    case 'product_ops':
      keywords = ['用户与需求','方案与PRD','项目交付','运营与增长','数据与复盘'];
      juniors = [
        mk(0,'junior','用户与需求','【初级】描述一次用户访谈或需求收集经历。'),
        mk(1,'junior','方案与PRD','【初级】说明你参与过的PRD要点与评审。'),
        mk(2,'junior','项目交付','【初级】描述你参与的项目协同与排期。'),
        mk(3,'junior','运营与增长','【初级】说明你参与的活动策划或拉新留存。'),
        mk(4,'junior','数据与复盘','【初级】说明你进行的简单数据分析与复盘。')
      ];
      mids = [
        mk(5,'mid','用户与需求','【中级】建立需求评估与优先级框架。'),
        mk(6,'mid','方案与PRD','【中级】设计方案取舍与约束条件。'),
        mk(7,'mid','项目交付','【中级】制定交付节奏、里程碑与风险管理。'),
        mk(8,'mid','运营与增长','【中级】制定增长目标与策略，评估效果。'),
        mk(9,'mid','数据与复盘','【中级】搭建指标看板与复盘流程。')
      ];
      seniors = [
        mk(10,'senior','用户与需求','【高级】用户洞察与产品战略制定。'),
        mk(11,'senior','方案与PRD','【高级】跨团队协作下的方案治理。'),
        mk(12,'senior','项目交付','【高级】多项目并行的资源配置与统筹。'),
        mk(13,'senior','运营与增长','【高级】增长飞轮与生态建设。'),
        mk(14,'senior','数据与复盘','【高级】数据驱动的迭代与决策。')
      ];
      experts = [
        mk(15,'expert','用户与需求','【专家】从战略到执行的用户价值链。'),
        mk(16,'expert','方案与PRD','【专家】复杂系统的方案治理与演进。'),
        mk(17,'expert','项目交付','【专家】组织层面的交付能力建设。'),
        mk(18,'expert','运营与增长','【专家】长期增长策略与组织协同。'),
        mk(19,'expert','数据与复盘','【专家】数据文化与度量体系。')
      ];
      break;
    case 'procurement_supply':
      keywords = ['寻源与比价','供应商管理','库存与计划','物流与配送','成本与风险'];
      juniors = [
        mk(0,'junior','寻源与比价','【初级】描述一次询价/比价流程与记录。'),
        mk(1,'junior','供应商管理','【初级】说明供应商档案与联系维护。'),
        mk(2,'junior','库存与计划','【初级】描述你参与的库存盘点或补货建议。'),
        mk(3,'junior','物流与配送','【初级】举例一次发货/到货协调。'),
        mk(4,'junior','成本与风险','【初级】列举采购中的成本与风险点。')
      ];
      mids = [
        mk(5,'mid','寻源与比价','【中级】制定寻源策略与多维度评分。'),
        mk(6,'mid','供应商管理','【中级】建立绩效考核与分级管理。'),
        mk(7,'mid','库存与计划','【中级】设计安全库存与补货模型。'),
        mk(8,'mid','物流与配送','【中级】优化物流时效与成本。'),
        mk(9,'mid','成本与风险','【中级】开展风险评估与预案。')
      ];
      seniors = [
        mk(10,'senior','寻源与比价','【高级】采购策略与谈判框架设计。'),
        mk(11,'senior','供应商管理','【高级】伙伴管理与共同提升机制。'),
        mk(12,'senior','库存与计划','【高级】供应计划与跨部门协同。'),
        mk(13,'senior','物流与配送','【高级】仓配一体化与网络优化。'),
        mk(14,'senior','成本与风险','【高级】成本治理与合规管理。')
      ];
      experts = [
        mk(15,'expert','寻源与比价','【专家】全球寻源与长期协议管理。'),
        mk(16,'expert','供应商管理','【专家】战略伙伴与共同创新。'),
        mk(17,'expert','库存与计划','【专家】供应链韧性与风险策略。'),
        mk(18,'expert','物流与配送','【专家】网络协同与数字化治理。'),
        mk(19,'expert','成本与风险','【专家】总拥有成本（TCO）与治理体系。')
      ];
      break;
    case 'manufacturing':
      keywords = ['生产计划','工艺与设备','质量管理','安全与5S','成本与效率'];
      juniors = [
        mk(0,'junior','生产计划','【初级】说明排产或工单执行的参与情况。'),
        mk(1,'junior','工艺与设备','【初级】描述一次设备点检或维护记录。'),
        mk(2,'junior','质量管理','【初级】描述你参与的检验/不良处理与记录。'),
        mk(3,'junior','安全与5S','【初级】列举现场安全与5S的执行要点。'),
        mk(4,'junior','成本与效率','【初级】举例一次效率提升或报废控制。')
      ];
      mids = [
        mk(5,'mid','生产计划','【中级】优化排产与物料同步策略。'),
        mk(6,'mid','工艺与设备','【中级】提出工艺优化或设备改造建议。'),
        mk(7,'mid','质量管理','【中级】建立质量数据与改善闭环。'),
        mk(8,'mid','安全与5S','【中级】制定安全培训与检查机制。'),
        mk(9,'mid','成本与效率','【中级】推进精益改善与成本分析。')
      ];
      seniors = [
        mk(10,'senior','生产计划','【高级】构建产能评估与应急响应体系。'),
        mk(11,'senior','工艺与设备','【高级】工艺路线优化与设备管理体系。'),
        mk(12,'senior','质量管理','【高级】质量管理系统与供应商质量协同。'),
        mk(13,'senior','安全与5S','【高级】安全治理与现场文化建设。'),
        mk(14,'senior','成本与效率','【高级】从全流程提升OEE与成本表现。')
      ];
      experts = [
        mk(15,'expert','生产计划','【专家】柔性制造与数字化产线治理。'),
        mk(16,'expert','工艺与设备','【专家】工艺创新与设备生命周期管理。'),
        mk(17,'expert','质量管理','【专家】企业级质量战略与风险管理。'),
        mk(18,'expert','安全与5S','【专家】安全管理体系与持续改进。'),
        mk(19,'expert','成本与效率','【专家】精益体系与端到端效率治理。')
      ];
      break;
    case 'real_estate':
      keywords = ['项目策划','设计与成本','施工与监理','验收与交付','物业与运营'];
      juniors = [
        mk(0,'junior','项目策划','【初级】描述你参与的项目立项或策划任务。'),
        mk(1,'junior','设计与成本','【初级】说明图纸整理或成本数据收集。'),
        mk(2,'junior','施工与监理','【初级】描述你参与的现场巡检或问题记录。'),
        mk(3,'junior','验收与交付','【初级】说明你参与的验收清单与整改跟进。'),
        mk(4,'junior','物业与运营','【初级】说明物业服务与住户沟通事项。')
      ];
      mids = [
        mk(5,'mid','项目策划','【中级】制定项目里程碑与风险清单。'),
        mk(6,'mid','设计与成本','【中级】优化设计变更与成本控制流程。'),
        mk(7,'mid','施工与监理','【中级】建立现场问题闭环与质量督导。'),
        mk(8,'mid','验收与交付','【中级】设计交付计划与住户沟通机制。'),
        mk(9,'mid','物业与运营','【中级】构建物业服务指标与改进方案。')
      ];
      seniors = [
        mk(10,'senior','项目策划','【高级】项目组合管理与收益评估。'),
        mk(11,'senior','设计与成本','【高级】成本治理与合同管理策略。'),
        mk(12,'senior','施工与监理','【高级】质量、安全与进度的综合治理。'),
        mk(13,'senior','验收与交付','【高级】交付体验与风险缓释设计。'),
        mk(14,'senior','物业与运营','【高级】物业运营与客户满意度提升。')
      ];
      experts = [
        mk(15,'expert','项目策划','【专家】城市更新/综合体项目的顶层设计。'),
        mk(16,'expert','设计与成本','【专家】全生命周期成本与价值管理。'),
        mk(17,'expert','施工与监理','【专家】施工治理与供应链协同。'),
        mk(18,'expert','验收与交付','【专家】交付策略与品牌影响。'),
        mk(19,'expert','物业与运营','【专家】智慧物业与运营数字化。')
      ];
      break;
    case 'design':
      keywords = ['需求与简报','概念与草图','规范与交付','审美与品牌','复盘与提升'];
      juniors = [
        mk(0,'junior','需求与简报','【初级】说明你参与的设计简报与需求梳理。'),
        mk(1,'junior','概念与草图','【初级】描述一次概念探索或草图提案。'),
        mk(2,'junior','规范与交付','【初级】说明你参与的文件规范与交付清单。'),
        mk(3,'junior','审美与品牌','【初级】列举你参考的审美风格与品牌要素。'),
        mk(4,'junior','复盘与提升','【初级】说明一次设计复盘的收获。')
      ];
      mids = [
        mk(5,'mid','需求与简报','【中级】建立需求澄清与设计边界。'),
        mk(6,'mid','概念与草图','【中级】多方向概念评估与取舍。'),
        mk(7,'mid','规范与交付','【中级】制定设计规范与组件库。'),
        mk(8,'mid','审美与品牌','【中级】构建品牌识别与一致性。'),
        mk(9,'mid','复盘与提升','【中级】建立评审与改进机制。')
      ];
      seniors = [
        mk(10,'senior','需求与简报','【高级】设计策略与业务目标对齐。'),
        mk(11,'senior','概念与草图','【高级】从概念到体验的整体把控。'),
        mk(12,'senior','规范与交付','【高级】设计系统与跨团队协作。'),
        mk(13,'senior','审美与品牌','【高级】品牌资产的长期建设。'),
        mk(14,'senior','复盘与提升','【高级】设计度量与质量保障。')
      ];
      experts = [
        mk(15,'expert','需求与简报','【专家】面向战略的设计治理。'),
        mk(16,'expert','概念与草图','【专家】塑造差异化与标志性风格。'),
        mk(17,'expert','规范与交付','【专家】企业级设计系统建设。'),
        mk(18,'expert','审美与品牌','【专家】品牌进化与跨媒介表达。'),
        mk(19,'expert','复盘与提升','【专家】设计文化与组织能力。')
      ];
      break;
    case 'education':
      keywords = ['教学设计','课堂管理','测评与反馈','家校沟通','课程运营'];
      juniors = [
        mk(0,'junior','教学设计','【初级】描述一次教案编写与目标设定。'),
        mk(1,'junior','课堂管理','【初级】说明你的课堂管理与互动方法。'),
        mk(2,'junior','测评与反馈','【初级】描述一次作业/测验的设计与反馈。'),
        mk(3,'junior','家校沟通','【初级】举例一次与家长沟通的场景。'),
        mk(4,'junior','课程运营','【初级】说明课程安排与资源准备。')
      ];
      mids = [
        mk(5,'mid','教学设计','【中级】搭建教学目标与评价体系。'),
        mk(6,'mid','课堂管理','【中级】提升课堂效率与参与度的方案。'),
        mk(7,'mid','测评与反馈','【中级】设计分层作业与差异化教学。'),
        mk(8,'mid','家校沟通','【中级】建立家校沟通机制与记录。'),
        mk(9,'mid','课程运营','【中级】优化课程安排与资源协同。')
      ];
      seniors = [
        mk(10,'senior','教学设计','【高级】课程体系与跨学科融合。'),
        mk(11,'senior','课堂管理','【高级】课堂文化与长期管理策略。'),
        mk(12,'senior','测评与反馈','【高级】形成性评价与数据应用。'),
        mk(13,'senior','家校沟通','【高级】家校协同的项目化实践。'),
        mk(14,'senior','课程运营','【高级】教务运营与质量保障。')
      ];
      experts = [
        mk(15,'expert','教学设计','【专家】教育理念与课程创新体系。'),
        mk(16,'expert','课堂管理','【专家】学校层面的课堂治理。'),
        mk(17,'expert','测评与反馈','【专家】评估体系与教育数据治理。'),
        mk(18,'expert','家校沟通','【专家】社区/家校融合的长期机制。'),
        mk(19,'expert','课程运营','【专家】教务战略与资源配置。')
      ];
      break;
    case 'healthcare':
      keywords = ['诊疗与护理','流程与规范','安全与应急','沟通与人文','质量与评估'];
      juniors = [
        mk(0,'junior','诊疗与护理','【初级】说明你参与的基本诊疗或护理流程。'),
        mk(1,'junior','流程与规范','【初级】描述你遵循的操作规范与记录。'),
        mk(2,'junior','安全与应急','【初级】说明你参与的应急演练或安全检查。'),
        mk(3,'junior','沟通与人文','【初级】举例患者沟通与人文关怀。'),
        mk(4,'junior','质量与评估','【初级】说明质控检查与改进建议。')
      ];
      mids = [
        mk(5,'mid','诊疗与护理','【中级】优化流程并提升医疗体验。'),
        mk(6,'mid','流程与规范','【中级】制定操作流程与培训机制。'),
        mk(7,'mid','安全与应急','【中级】建立应急预案与演练。'),
        mk(8,'mid','沟通与人文','【中级】推动沟通规范与满意度提升。'),
        mk(9,'mid','质量与评估','【中级】质量数据管理与改进闭环。')
      ];
      seniors = [
        mk(10,'senior','诊疗与护理','【高级】多学科协作与病例管理。'),
        mk(11,'senior','流程与规范','【高级】规范与质量体系建设。'),
        mk(12,'senior','安全与应急','【高级】安全治理与风险管理。'),
        mk(13,'senior','沟通与人文','【高级】患者体验与人文关怀体系。'),
        mk(14,'senior','质量与评估','【高级】质量指标与评估模型。')
      ];
      experts = [
        mk(15,'expert','诊疗与护理','【专家】医疗服务体系与学科建设。'),
        mk(16,'expert','流程与规范','【专家】规范制定与持续改进治理。'),
        mk(17,'expert','安全与应急','【专家】安全文化与系统性保障。'),
        mk(18,'expert','沟通与人文','【专家】人文关怀的组织与实践。'),
        mk(19,'expert','质量与评估','【专家】质量治理与评估框架。')
      ];
      break;
    case 'hospitality':
      keywords = ['服务标准','客房/大厅','餐饮与后厨','安全与卫生','体验与口碑'];
      juniors = [
        mk(0,'junior','服务标准','【初级】说明你遵循的服务礼仪与标准。'),
        mk(1,'junior','客房/大厅','【初级】描述一次客房/大厅的日常工作。'),
        mk(2,'junior','餐饮与后厨','【初级】描述你参与的库存盘点或补货建议。'),
        mk(3,'junior','安全与卫生','【初级】举例清洁与安全检查记录。'),
        mk(4,'junior','体验与口碑','【初级】说明你处理投诉或意见的经历。')
      ];
      mids = [
        mk(5,'mid','服务标准','【中级】制定服务指标与培训机制。'),
        mk(6,'mid','客房/大厅','【中级】优化运营流程与效率。'),
        mk(7,'mid','餐饮与后厨','【中级】制定后厨出品与库存控制规范。'),
        mk(8,'mid','安全与卫生','【中级】建立卫生检查与整改闭环。'),
        mk(9,'mid','体验与口碑','【中级】设计满意度调查与改进方案。')
      ];
      seniors = [
        mk(10,'senior','服务标准','【高级】服务战略与品牌一致性。'),
        mk(11,'senior','客房/大厅','【高级】多门店的运营协同与治理。'),
        mk(12,'senior','餐饮与后厨','【高级】厨房管理与成本控制策略。'),
        mk(13,'senior','安全与卫生','【高级】HSE治理与突发事件管理。'),
        mk(14,'senior','体验与口碑','【高级】体验设计与口碑运营。')
      ];
      experts = [
        mk(15,'expert','服务标准','【专家】服务体系的标准化与持续改进。'),
        mk(16,'expert','客房/大厅','【专家】规模化运营与流程再造。'),
        mk(17,'expert','餐饮与后厨','【专家】餐饮品牌与菜单工程。'),
        mk(18,'expert','安全与卫生','【专家】HSE治理体系与审计。'),
        mk(19,'expert','体验与口碑','【专家】声誉管理与客户成功体系。')
      ];
      break;
    default:
      keywords = ['背景','职责','流程','协同','复盘'];
      juniors = [
        mk(0,'junior','背景','【初级】描述你对岗位的基本理解与经历。'),
        mk(1,'junior','职责','【初级】列举岗位常见职责与你执行情况。'),
        mk(2,'junior','流程','【初级】描述你参与的关键流程与表单。'),
        mk(3,'junior','协同','【初级】说明与他部门的协作事项。'),
        mk(4,'junior','复盘','【初级】说明一次工作复盘与改进点。')
      ];
      mids = [
        mk(5,'mid','背景','【中级】明确岗位目标与关键指标。'),
        mk(6,'mid','职责','【中级】优化职责边界与工作方法。'),
        mk(7,'mid','流程','【中级】梳理流程瓶颈并提出优化方案。'),
        mk(8,'mid','协同','【中级】建立协作机制与信息同步。'),
        mk(9,'mid','复盘','【中级】建立复盘机制与改进闭环。')
      ];
      seniors = [
        mk(10,'senior','背景','【高级】岗位战略定位与价值贡献。'),
        mk(11,'senior','职责','【高级】岗位能力模型与培训路径。'),
        mk(12,'senior','流程','【高级】流程治理与风险控制。'),
        mk(13,'senior','协同','【高级】跨部门协同的机制与治理。'),
        mk(14,'senior','复盘','【高级】数据驱动的持续改进。')
      ];
      experts = [
        mk(15,'expert','背景','【专家】岗位体系设计与组织建设。'),
        mk(16,'expert','职责','【专家】角色治理与权责体系。'),
        mk(17,'expert','流程','【专家】流程再造与共享服务。'),
        mk(18,'expert','协同','【专家】端到端的协同与效率治理。'),
        mk(19,'expert','复盘','【专家】组织级复盘与经验库建设。')
      ];
      break;
  }

  return { keywords, questions: [...juniors, ...mids, ...seniors, ...experts] };
}
window.Store = { save, load, clearKeys };
window.API = { postJSON };
window.Q = { parseQuestionDatas, makeFallback, letterForIndex, makeOfflineSet };

function makeOfflineSet(category = 'java', position = '通用岗位', jd = '', salary = '') {
  const matchedRole = fuzzyMatchRole(position || category);
  const diff = difficultyFromSalary(salary);
  const fullBank = generateRoleQuestionBank(matchedRole, position, jd);
  const selected = fullBank.questions.filter(q => q.difficulty === diff).slice(0, 5);
  return {
    randId: 'OFF-' + Math.random().toString(36).slice(2, 10),
    questionDatas: { keywords: fullBank.keywords, questions: selected }
  };
}