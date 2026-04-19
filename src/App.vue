<template>
  <main class="page">
    <section class="shell">
      <nav class="top-nav">
        <RouterLink class="nav-link" to="/talent">Talent 接口页</RouterLink>
        <RouterLink class="nav-link" to="/documents">Document 接口页</RouterLink>
      </nav>
      <RouterView />
    </section>
  </main>
</template>
