package com.caobafinanzas.app;

import android.os.Bundle;
import com.caobafinanzas.app.widgets.CaobaWidgetsPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CaobaWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
