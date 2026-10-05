<script lang="ts">let c = $state(0); setInterval(() => c++, 100);</script>
<p onclick={() => c++}>{c}</p>
