# 深度 AI 集成指南 (Deep AI Integration)

本文档指导如何利用 Spring AI 和向量数据库实现 RAG（检索增强生成）以及智能辅助创作功能。

## 1. 检索增强生成 (RAG)

RAG 允许 AI 基于您的私有博客数据回答问题，而不是仅依靠大模型的通用训练数据。

### 1.1 架构设计
1.  **Embedding (向量化)**: 使用 Embedding 模型（如 OpenAI `text-embedding-ada-002` 或本地 `Ollama`）将博客文章内容转换为向量。
2.  **Vector Store (向量数据库)**: 存储向量数据。推荐使用 **PostgreSQL + pgvector** 插件，或者 **Milvus**。
3.  **Retrieval (检索)**: 用户提问 -> 转换为向量 -> 在数据库中搜索相似向量 -> 提取相关文章片段。
4.  **Generation (生成)**: 将相关片段作为 Context 喂给 LLM，生成最终回答。

### 1.2 实施步骤

**Step 1: 引入依赖**
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
</dependency>
```

**Step 2: 配置向量数据库 (application.yml)**
```yaml
spring:
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW
        dimension: 1536 # 取决于使用的 Embedding 模型
```

**Step 3: 写入向量 (BlogPostService)**
当文章发布或更新时，同步更新向量库。

```java
@Autowired
VectorStore vectorStore;

public void syncPostToVectorDb(BlogPost post) {
    // 将文章内容分割为 Document
    List<Document> documents = new ArrayList<>();
    Document doc = new Document(post.getContent());
    doc.getMetadata().put("postId", post.getId());
    doc.getMetadata().put("title", post.getTitle());
    
    vectorStore.add(documents);
}
```

**Step 4: 实现问答接口 (AiController)**

```java
@GetMapping("/ask")
public String ask(@RequestParam String query) {
    // 1. 检索相似文档
    List<Document> similarDocs = vectorStore.similaritySearch(query);
    
    // 2. 构建 Prompt
    String context = similarDocs.stream().map(Document::getContent).collect(Collectors.joining("\n"));
    String prompt = "基于以下内容回答问题:\n" + context + "\n\n问题: " + query;
    
    // 3. 调用 AI
    return aiClient.chat(prompt);
}
```

---

## 2. 智能辅助创作

### 2.1 自动摘要与 SEO 优化

在文章发布流程中增加 AI 处理环节。

**后端实现 (BlogPostService):**

```java
public void publishPost(BlogPost post) {
    // ... 保存文章逻辑 ...

    // 异步调用 AI 生成摘要
    CompletableFuture.runAsync(() -> {
        String prompt = "请为以下博客文章生成一段简短的摘要（100字以内）和5个SEO关键词:\n" + post.getContent();
        String result = aiClient.chat(prompt);
        
        // 解析结果并更新数据库
        post.setSummary(parseSummary(result));
        postRepository.save(post);
    });
}
```

### 2.2 编辑器 AI 润色

在前端编辑器（TipTap）中添加“AI 润色”按钮。

**前端实现 (TipTapEditor.jsx):**

```jsx
const handleAiPolish = async () => {
    const selection = editor.state.selection;
    const text = editor.state.doc.textBetween(selection.from, selection.to);
    
    if (!text) return;

    const polishedText = await aiService.sendMessage(
        `请润色以下文本，使其更通顺、专业，保持原意:\n${text}`
    );
    
    // 替换选中文本
    editor.commands.insertContent(polishedText);
};
```
