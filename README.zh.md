# dsh-llm-fallback

LLM 模型自动降级插件。当某个模型请求失败时，自动切换到下一个配置的模型并重试。

**全部配置通过 DSH 设置界面完成，无需手动编辑任何配置文件。**

## 功能

- 配置多个 provider+model 的降级顺序
- 每个模型连续失败达到阈值后自动切换到下一个
- 所有模型都用完后循环回到第一个（无限循环降级）
- 配置变更实时生效，无需重启 DSH

## 安装

### 方式一：插件市场（推荐）

```bash
dsh plugin --profile web add dsh-llm-fallback
```

然后在 DSH **设置界面** 中配置降级链。

### 方式二：本地路径

在 `cordis.patch.yml` 中添加：

```yaml
- id: llm-fallback
  name: 'file:/path/to/dsh-llm-fallback'
```

1. 打开 DSH → **设置** → 找到 **llm-fallback** 区域
2. 在 `fallbackChain` 中添加你的 provider+model 配对
3. 调整 `maxFailuresPerModel` 和 `fallbackOn` 触发条件
4. 修改即时生效，无需重启

## 设置界面字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `fallbackChain` | 列表 | 每个条目包含 `provider`（route ID）和 `model`（模型 ID） |
| `fallbackOn` | 列表 | 触发降级的错误码：`RATE_LIMIT`, `SERVER`, `TIMEOUT`, `TRANSPORT`, `EMPTY_RESPONSE` |
| `maxFailuresPerModel` | 数字 | 每个模型连续失败多少次后切换，默认 `1` |

## fallbackChain 配置示例

```yaml
# 在 DSH 设置界面中填写：
fallbackChain:
  - provider: deepseek
    model: deepseek-chat
  - provider: deepseek
    model: deepseek-reasoner
  - provider: openai
    model: gpt-4o
  - provider: openai
    model: gpt-4o-mini
```

> **注意**：`provider` 值必须与 DSH 设置 → 模型 页面中配置的 provider route ID 完全一致。

## 工作原理

```
请求发出 → agent/request waterfall
              │
              ├─ 读取当前 settings 中的 fallbackChain
              ├─ 检查当前 provider/model 失败次数
              ├─ 未达阈值 → 正常发送
              └─ 达到阈值 → 切换到 fallbackChain 中的下一个 model
                        ↓
              请求用新 model 重新发出
                        ↓
              成功 → 计数重置 / 失败 → 继续切换
```

配置变更通过 `onChange` 钩子实时同步，下次请求时自动使用最新配置。

## 注意事项

- 插件完全依赖 DSH 设置系统，不读取 `cordis.patch.yml` 中的 config
- 跨 provider 切换时，新 provider 的 API Key 必须已正确配置
- 建议将 `dsh-llm-retry` 放在本插件之前注册，让它先重试同一模型

## 系统要求

- DSH >= 0.1.0-rc.2
- 在 **设置 → 模型** 中至少配置一个 provider+model
- `fallbackChain` 中的所有 provider 和 model 必须已注册

## 许可证

MIT License. Copyright (c) 2025 [eye33](https://github.com/eye33)
